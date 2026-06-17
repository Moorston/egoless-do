## ADDED Requirements

### Requirement: Event-driven progress updates
The system SHALL use expo-audio's `onPlaybackStatusUpdate` callback to propagate playback progress instead of polling.

#### Scenario: Progress updates via store
- **WHEN** the audio player's playback status changes
- **THEN** the system updates `currentTime` and `duration` in the music Zustand store

#### Scenario: No polling intervals
- **WHEN** PlayerBar or TrackListItem is mounted
- **THEN** no `setInterval` is used to read playback progress

### Requirement: Shared progress source
The system SHALL provide a single source of truth for playback progress accessible by all UI components.

#### Scenario: PlayerBar reads from store
- **WHEN** PlayerBar renders
- **THEN** it reads `currentTime` and `duration` directly from the music store via selector

#### Scenario: TrackListItem reads from store
- **WHEN** TrackListItem renders and is the current track
- **THEN** it reads progress from the music store without its own polling interval

#### Scenario: Progress accuracy
- **WHEN** the audio player reports a status update
- **THEN** the store reflects the new currentTime within one update cycle

### Requirement: Strongly typed audio player reference
The system SHALL define a TypeScript interface for the audio player reference, replacing the current `any` type.

#### Scenario: AudioPlayerRef interface
- **WHEN** code accesses `audioPlayerRef.current`
- **THEN** the type system enforces the correct shape: `{ currentTime: number; duration: number; play(): void; pause(): void; seekTo(position: number): void; volume: number; loop: boolean; playing: boolean }`

#### Scenario: Type errors on misuse
- **WHEN** a developer accesses a non-existent property on the audio player
- **THEN** TypeScript reports a compile-time error

### Requirement: Progress-driven UI animations
The system SHALL update waveform progress bars and animated icons without causing unnecessary re-renders of parent components.

#### Scenario: WaveformBar receives progress as prop
- **WHEN** the music store's currentTime updates
- **THEN** only the WaveformBar component re-renders, not the entire PlayerBar

#### Scenario: AnimatedMusicIcon uses shared value
- **WHEN** playback state changes
- **THEN** AnimatedMusicIcon updates via Reanimated shared value without JS thread involvement
