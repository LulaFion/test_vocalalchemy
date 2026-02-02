from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path

from ..models.training import (
    TrainingProject,
    TrainingConfig,
    TrainingStatus,
    LabelUpdate,
    StartTrainingRequest,
)
from ..services.training_service import training_service

router = APIRouter(prefix="/api/training", tags=["training"])


@router.get("/projects", response_model=List[TrainingProject])
async def list_projects():
    """List all training projects."""
    return training_service.list_projects()


@router.get("/projects/{project_id}", response_model=TrainingProject)
async def get_project(project_id: str):
    """Get a training project by ID."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects", response_model=TrainingProject)
async def create_project(config: TrainingConfig):
    """Create a new training project."""
    return training_service.create_project(config)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a training project."""
    success = training_service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


@router.post("/projects/{project_id}/upload")
async def upload_audio(project_id: str, files: List[UploadFile] = File(...)):
    """Upload audio files to a project."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    uploaded = []
    for file in files:
        content = await file.read()
        success = await training_service.upload_audio(project_id, file.filename, content)
        if success:
            uploaded.append(file.filename)

    return {"uploaded": uploaded, "count": len(uploaded)}


@router.post("/projects/{project_id}/preprocess")
async def start_preprocessing(
    project_id: str,
    config: TrainingConfig,
    background_tasks: BackgroundTasks
):
    """Start preprocessing pipeline (UVR5, slicing, ASR)."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run preprocessing in background
    background_tasks.add_task(training_service.run_preprocessing, project_id, config)

    return {"message": "Preprocessing started", "project_id": project_id}


@router.get("/projects/{project_id}/segments")
async def get_segments(project_id: str):
    """Get all audio segments for labeling."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"segments": project.segments}


@router.patch("/projects/{project_id}/segments/{segment_id}")
async def update_segment(project_id: str, segment_id: str, update: LabelUpdate):
    """Update a segment's transcription."""
    update.id = segment_id
    success = training_service.update_segment_label(project_id, update)
    if not success:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment updated"}


@router.post("/projects/{project_id}/segments/batch")
async def update_segments_batch(project_id: str, updates: List[LabelUpdate]):
    """Update multiple segments at once."""
    success = training_service.update_all_labels(project_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": f"Updated {len(updates)} segments"}


@router.delete("/projects/{project_id}/segments/{segment_id}")
async def delete_segment(project_id: str, segment_id: str):
    """Delete a segment from the project."""
    success = training_service.delete_segment(project_id, segment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"message": "Segment deleted"}


@router.get("/projects/{project_id}/audio/{filename:path}")
async def get_segment_audio(project_id: str, filename: str):
    """Serve audio file for playback in labeling UI."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if filename is an absolute path (from imported .list file)
    if Path(filename).is_absolute():
        abs_path = Path(filename)
        if abs_path.exists():
            return FileResponse(abs_path, media_type="audio/wav")

    # Check in sliced directory
    sliced_path = Path(project.sliced_dir) / filename
    if sliced_path.exists():
        return FileResponse(sliced_path, media_type="audio/wav")

    # Check in vocals directory
    vocals_path = Path(project.vocals_dir) / filename
    if vocals_path.exists():
        return FileResponse(vocals_path, media_type="audio/wav")

    raise HTTPException(status_code=404, detail="Audio file not found")


@router.post("/projects/{project_id}/import-list")
async def import_list_file(project_id: str, list_path: str = Query(..., description="Path to the .list file")):
    """Import segments from an existing GPT-SoVITS .list file."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    list_file = Path(list_path)
    if not list_file.exists():
        raise HTTPException(status_code=404, detail=f"List file not found: {list_path}")

    count = training_service.import_list_file(project_id, list_file)
    return {"message": f"Imported {count} segments", "count": count}


@router.post("/projects/{project_id}/train")
async def start_training(
    project_id: str,
    request: StartTrainingRequest,
    background_tasks: BackgroundTasks
):
    """Start model training after labels are confirmed."""
    project = training_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.status != TrainingStatus.LABELING:
        raise HTTPException(
            status_code=400,
            detail=f"Project must be in 'labeling' status to start training. Current: {project.status}"
        )

    # Update training config if provided
    # GPT parameters
    if request.gpt_epochs is not None:
        project.gpt_epochs = request.gpt_epochs
    if request.gpt_batch_size is not None:
        project.gpt_batch_size = request.gpt_batch_size
    if request.gpt_save_every is not None:
        project.gpt_save_every = request.gpt_save_every
    if request.gpt_dpo_training is not None:
        project.gpt_dpo_training = request.gpt_dpo_training
    # SoVITS parameters
    if request.sovits_epochs is not None:
        project.sovits_epochs = request.sovits_epochs
    if request.sovits_batch_size is not None:
        project.sovits_batch_size = request.sovits_batch_size
    if request.sovits_save_every is not None:
        project.sovits_save_every = request.sovits_save_every
    if request.sovits_text_lr_weight is not None:
        project.sovits_text_lr_weight = request.sovits_text_lr_weight

    # Save updated project
    training_service._save_project(project)

    # Run training in background
    background_tasks.add_task(training_service.start_training, project_id)

    return {"message": "Training started", "project_id": project_id}
