# Character Training Workflows

Complete specifications for character voice training interfaces.

## Simple Mode (Recommended)

**Route:** `/training/new`

Fully automated workflow requiring minimal user input.

### User Interface

```
┌─────────────────────────────────────────────────────────┐
│  新增角色 (Add New Character)                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  角色名稱 (Character Name) *                             │
│  ┌─────────────────────────────────────┐               │
│  │ Alice_Cheerful                      │               │
│  └─────────────────────────────────────┘               │
│                                                         │
│  上傳訓練音檔 (Upload Training Audio) *                  │
│  要求：5-30 分鐘，清晰人聲，WAV/MP3 格式                  │
│  ┌─────────────────────────────────────┐               │
│  │  📁 拖曳檔案至此 或 點擊上傳           │               │
│  │     Drag & drop or click to upload  │               │
│  └─────────────────────────────────────┘               │
│  alice_voice_samples.wav (28.5 MB, 15:32)              │
│                                                         │
│  語言 (Language) *                                       │
│  ⚪ 中文 (Chinese)  ⚫ 英文 (English)  ⚪ 日文 (Japanese) │
│                                                         │
│  自動處理選項 (Auto-processing Options)                  │
│  ☑ 移除背景音樂 (Remove background music)                │
│  ☑ 降噪處理 (Noise reduction)                           │
│  ☑ 自動切片 (Auto-slice into segments)                  │
│  ☑ 自動轉錄文本 (Auto-generate transcripts)              │
│                                                         │
│  ┌─────────────────────────────────────┐               │
│  │   開始訓練 (Start Training)          │ ← Primary    │
│  └─────────────────────────────────────┘               │
│                                                         │
│  [ 進階模式 (Advanced Mode) → ]    ← Link to new page │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**When clicked, redirects to: `/training/advanced/new`**

### Automated Pipeline Steps

1. **音檔預處理 (Audio Preprocessing)** - 10%
   - UVR5 分離人聲 (Vocal separation)
   - 降噪處理 (Noise reduction)
   - 切片分段 (Slice into 2-10 sec segments)

2. **文本轉錄 (Transcription)** - 30%
   - ASR 自動辨識 (Automatic speech recognition)
   - 生成標註檔案 (Generate annotation files)

3. **訓練資料準備 (Dataset Preparation)** - 50%
   - 文本特徵提取 (Text tokenization + BERT features)
   - SSL 聲學特徵 (SSL feature extraction)
   - 語意 Token 提取 (Semantic token extraction)

4. **模型訓練 (Model Training)** - 70%
   - SoVITS 音色模型 (Voice timbre model)
   - GPT 語調模型 (Prosody model)

5. **完成 (Completed)** - 100%
   - 角色可用 (Character ready for use)

### Progress Display

```
┌─────────────────────────────────────────────────────────┐
│  訓練中 (Training in Progress)                          │
├─────────────────────────────────────────────────────────┤
│  角色：Alice_Cheerful                                   │
│  狀態：正在切片音檔... (Slicing audio...)                │
│                                                         │
│  [████████████████░░░░░░░░] 65%                        │
│                                                         │
│  預估剩餘時間 (Estimated time): 18 分鐘                  │
│                                                         │
│  已完成步驟 (Completed):                                 │
│  ✓ 分離人聲 (Vocal separation)                          │
│  ✓ 降噪處理 (Noise reduction)                           │
│  ⏳ 切片分段 (Audio slicing)... 458/687 files           │
│  ⋯ 文本轉錄 (Transcription)                             │
│  ⋯ 資料準備 (Dataset preparation)                       │
│  ⋯ 模型訓練 (Model training)                            │
│                                                         │
│  [ 在背景執行 (Run in Background) ]                     │
│  [ 取消訓練 (Cancel Training) ]                         │
└─────────────────────────────────────────────────────────┘
```

## Advanced Mode (Separate Page)

**Route:** `/training/advanced/new`

**Purpose:** For power users who need manual control over each preprocessing step.

**Page Layout:** Full-width wizard interface with step progression indicator

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header                                                    [ ← Back ]    │
├─────────────────────────────────────────────────────────────────────────┤
│  進階角色訓練 (Advanced Character Training)                              │
│                                                                         │
│  Steps:  ① Upload  →  ② Preprocess  →  ③ Label  →  ④ Train  →  ⑤ Done │
│         ████████      ░░░░░░░░      ░░░░░░░      ░░░░░░    ░░░░░░      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Upload & Configuration

[... Full detailed specs from original CLAUDE.md lines 156-182 ...]

### Step 2: Audio Preprocessing

[... Full detailed specs from original CLAUDE.md lines 184-241 ...]

### Step 3: Transcription & Labeling

[... Full detailed specs from original CLAUDE.md lines 243-299 ...]

### Step 4: Training Configuration

[... Full detailed specs from original CLAUDE.md lines 301-349 ...]

### Step 5: Training Progress & Completion

[... Full detailed specs from original CLAUDE.md lines 351-427 ...]

**Advanced Mode Benefits:**
- **Full Visibility:** See/hear results at each preprocessing step
- **Quality Control:** Manual review and correction capabilities
- **Batch Operations:** Edit multiple labels at once
- **Skip Steps:** Bypass preprocessing if audio is pre-processed
- **Custom Parameters:** Fine-tune every training parameter
- **Real-time Feedback:** Preview audio after each processing step

**Navigation:**
- Users can save progress and return later (drafts auto-saved)
- Breadcrumb navigation shows current step
- "Back" button preserves all entered data
- Can switch between steps freely before training starts

---

*For detailed design system (colors, typography), see [design-system.md](./design-system.md)*
