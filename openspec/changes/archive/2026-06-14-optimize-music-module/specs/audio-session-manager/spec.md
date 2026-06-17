## ADDED Requirements

### Requirement: Audio session manager singleton
The system SHALL provide a single AudioSessionManager that coordinates all audio playback across the application.

#### Scenario: Music and exercise audio share one manager
- **WHEN** the app starts
- **THEN** exactly one AudioSessionManager instance exists and is accessible by both music and exercise audio modules

#### Scenario: Manager tracks active audio sources
- **WHEN** any audio source starts or stops playing
- **THEN** the manager updates its internal state to reflect the current active source

### Requirement: Audio priority rules
The system SHALL enforce priority-based audio playback where higher priority sources can interrupt lower priority ones.

#### Scenario: Bell sound plays over music
- **WHEN** user triggers a bell sound while music is playing
- **THEN** the bell plays immediately without interrupting the music

#### Scenario: Exercise ambient sound pauses music
- **WHEN** user selects an exercise ambient sound while music is playing
- **THEN** the music pauses and the ambient sound starts playing

#### Scenario: Ambient sound stops and music resumes
- **WHEN** the exercise ambient sound stops while music was previously playing
- **THEN** the music automatically resumes from where it was paused

### Requirement: Audio mode configuration
The system SHALL configure the audio session mode based on the currently active audio source.

#### Scenario: Music playback enables silent mode
- **WHEN** music starts playing
- **THEN** the audio session is configured with `playsInSilentMode: true`

#### Scenario: Single audio mode call per source switch
- **WHEN** the active audio source changes
- **THEN** `setAudioModeAsync` is called exactly once with the appropriate configuration

### Requirement: Exercise audio integration
The system SHALL replace the direct store manipulation in useExerciseAudio with manager-mediated playback.

#### Scenario: Exercise audio requests through manager
- **WHEN** useExerciseAudio wants to play an ambient sound
- **THEN** it requests playback through AudioSessionManager rather than directly controlling the player

#### Scenario: Manager handles music-exercise conflict
- **WHEN** exercise audio requests playback while music is active
- **THEN** the manager pauses the music player and starts the exercise audio
