# UI Flowcharts

Detailed page layouts and user interaction flows for VocalAlchemy.

> **UI Language Requirement:** All user-facing text in the web application should be displayed in Chinese with English in parentheses. Example: `角色聲音 (Character Voice)`

---

## Main Voice Synthesis Page

### Overall Page Structure

The VocalAlchemy website is a single-page internal web application with a clean, studio-tool aesthetic. The layout is left-to-right, top-to-bottom, guiding users through a predictable audio-production flow.

The page is divided into five main sections:
1. 頁首 / 導覽列 (Header / Navigation)
2. 角色選擇 (Character Selection)
3. 情緒與風格選擇 (Emotion & Style Selection)
4. 台詞輸入 (Script Input)
5. 輸出與匯出 (Output & Export)

---

### 1. Header / Navigation (Top Bar)

The top bar spans the full width of the page.

**Contents:**
1. VocalAlchemy logo (left)
2. Project selector dropdown
3. Logged-in user name / avatar (right)

**Purpose:**
- Confirms the current project context
- Reinforces that this is an internal production tool

No model names or technical terminology appear in the header.

---

### 2. Character Selection Panel (Left Section)

This section allows the user to select Character A (voice / timbre).

**Layout:**
- A labeled dropdown titled "角色聲音 (Character Voice)"
- List items show: Character name, Status indicator (Ready / Processing)
- A small preview button next to each character

**Actions:**
- "新增角色 (Add New Character)" button: Opens modal or navigates to training page
- Disabled characters appear greyed out

**User mental model:** "Who is speaking?"

```
┌──────────────────────────────┐
│ 角色聲音 (Character Voice)    │
├──────────────────────────────┤
│ ⚫ Alice_Cheerful    [▶]     │
│ ⚫ Bob_Serious       [▶]     │
│ ⚪ Charlie_Mystery (訓練中)   │
│                              │
│ [ + 新增角色 (Add New) ]     │
└──────────────────────────────┘
```

---

### 3. Emotion & Style Selection Panel (Center-Left Section)

This section controls Character B (emotion / prosody).

#### Emotion Presets

Displayed as large, clickable buttons or cards:
1. **平靜 (Calm)** - "Steady Energy"
2. **開心 (Happy)** - "Cheerful Vibe"
3. **興奮 (Excited)** - "Big Win Energy"
4. **戲劇化 (Dramatic)** - "Epic Moment"
5. **神秘 (Mysterious)** - "Suspenseful Tone"

Each preset has:
- An icon
- A short descriptive subtitle

#### Emotion Intensity

Below the presets is a horizontal slider labeled "情緒強度 (Emotion Intensity)":
- Left: 微妙 (Subtle)
- Right: 強烈 (Strong)

This slider does not expose technical parameters; it subtly modifies the selected emotional seed.

#### Reference Audio (Advanced Option)

An expandable panel titled "參考音檔 (Reference Audio)":
- Upload button for a 5–10 second audio file
- Inline audio player for preview
- When a reference is active, it overrides the preset emotion

**User mental model:** "How is the line being performed?"

```
┌────────────────────────────────────────┐
│ 情緒與風格 (Emotion & Style)            │
├────────────────────────────────────────┤
│                                        │
│  ┌────────┐  ┌─────────┐  ┌─────────┐  │
│  │ 😌平靜 │  │ 😊 開心 │  │ 🤩 興奮 │  │
│  └────────┘  └─────────┘  └─────────┘  │
│  ┌──────────┐   ┌────────┐             │
│  │ 🎭 戲劇化 │  │ 🕵️ 神秘│             │
│  └──────────┘   └────────┘             │
│                                        │
│  情緒強度 (Intensity):                  │
│  [────────●──────] 70%                 │
│                                        │
│  [ 參考音檔 (Reference Audio) ▼ ]      │
│                                        │
└────────────────────────────────────────┘
```

---

### 4. Script Input Section (Center Section)

This is the primary text entry area.

**Layout:**
- Large multiline text box labeled "台詞文本 (Script)"
- Placeholder example text: "恭喜！你贏得了大獎！(Congratulations! You've won the jackpot!)"

**Features:**
- Character counter
- Line break support
- Language indicator (if applicable)

**Optional toggles (collapsed by default):**
- 強調關鍵詞 (Emphasize keywords)
- 自動標點 (Auto punctuation)
- 自然停頓 (Natural pauses)

**User mental model:** "What is being said?"

```
┌─────────────────────────────────────────┐
│ 台詞文本 (Script)                        │
├─────────────────────────────────────────┤
│                                         │
│ Congratulations! You've won the         │
│ grand prize! This is your lucky day!    │
│                                         │
│                                         │
│                                         │
│                              [120/500]  │
│                                         │
│ [ 進階選項 (Advanced Options) ▼ ]       │
└─────────────────────────────────────────┘
```

---

### 5. Generate & Preview Section (Right Section)

This section handles audio generation and feedback.

**Preview Controls:**
- "預覽 (Preview)" button: Generates a quick, low-latency sample
- Loading indicator during processing

**Generate Controls:**
- Primary "合成語音 (Synthesize)" button - Glowing purple (#BD00FF)
- Secondary "重新生成 (Regenerate)" button for iteration

Buttons are large, visually prominent, and clearly labeled.

```
┌─────────────────────────────────────────┐
│ 生成與預覽 (Generate & Preview)          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   合成語音 (Synthesize)          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ 預覽 (Preview) ]                     │
│                                         │
└─────────────────────────────────────────┘
```

---

### 6. Output & Export Panel (Bottom or Right)

Once generation is complete, this panel becomes active.

**Contents:**
- Audio waveform display (Cyan #00F0FF)
- Playback controls
- Displayed metadata: Duration, Emotion, Character name

**Export Options:**
- Download WAV
- Download MP3

**Usage Tagging (Optional):**
Checkboxes for:
1. 基礎遊戲 (Base Game)
2. 大獎 (Big Win)
3. 獎勵遊戲 (Bonus)
4. 免費遊戲 (Free Game)

These tags are stored as metadata for asset tracking.

**User mental model:** "Is this usable in the game right now?"

```
┌─────────────────────────────────────────────────┐
│ 輸出與匯出 (Output & Export)                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔊 ════════●════════ 0:05 / 0:08                │
│                                                 │
│ 🌊 [Waveform visualization in cyan]            │
│                                                 │
│ 角色: Alice_Cheerful | 情緒: 興奮 | 時長: 8秒    │
│                                                 │
│ [ ⬇ Download WAV ] [ ⬇ Download MP3 ]          │
│                                                 │
│ 用途標記 (Usage Tags):                           │
│ ☐ 基礎遊戲  ☑ 大獎  ☐ 獎勵  ☐ 免費遊戲           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Character Repository Page

**Route:** `/characters`

### Character List View

```
┌─────────────────────────────────────────────────────────────┐
│ 角色管理 (Character Management)         [ + 新增角色 ]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Alice_Cheerful                          ⚫ Ready     │   │
│ │ 訓練時間: 2025-12-10  |  音檔: 15 分鐘                │   │
│ │ [ 測試 ] [ 編輯 ] [ 刪除 ]                            │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Bob_Serious                             ⚫ Ready     │   │
│ │ 訓練時間: 2025-12-08  |  音檔: 22 分鐘                │   │
│ │ [ 測試 ] [ 編輯 ] [ 刪除 ]                            │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Charlie_Mystery                         🟡 Training  │   │
│ │ 進度: 45% | 預估剩餘: 25 分鐘                          │   │
│ │ [ 查看進度 ] [ 取消訓練 ]                             │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Full Page Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ VocalAlchemy                Project: Game_2025   [User Avatar ▼]     │
├────────────┬────────────────┬──────────────────┬──────────────────────┤
│            │                │                  │                      │
│  角色選擇  │  情緒與風格     │   台詞文本        │   生成與預覽          │
│            │                │                  │                      │
│ ⚫ Alice   │  😌 平靜       │  Congratulations!│  ┌────────────────┐ │
│ ⚫ Bob     │  😊 開心       │  You've won the  │  │  合成語音       │ │
│ ⚪Charlie  │  🤩 興奮 ✓    │  grand prize!    │  └────────────────┘ │
│            │  🎭 戲劇化     │                  │                      │
│ [ + 新增 ] │  🕵️ 神秘       │  [120/500]       │  [ 預覽 ]           │
│            │                │                  │                      │
│            │ 情緒強度:       │                  │                      │
│            │ [──────●────]  │                  │                      │
│            │                │                  │                      │
└────────────┴────────────────┴──────────────────┴──────────────────────┤
│                          輸出與匯出 (Output & Export)                  │
├──────────────────────────────────────────────────────────────────────┤
│  🔊 ══════●══════ 0:05 / 0:08                                        │
│  🌊 [Waveform in Cyan]                                               │
│  [ ⬇ WAV ] [ ⬇ MP3 ]      標記: ☐ 基礎 ☑ 大獎 ☐ 獎勵 ☐ 免費        │
└──────────────────────────────────────────────────────────────────────┘
```

---

*For detailed training workflows, see [training-workflows.md](./training-workflows.md)*

*For color specifications, see [design-system.md](./design-system.md)*
