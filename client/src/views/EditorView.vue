<template>
  <main class="content-container">
    <div class="editor-header">
      <h1 class="editor-header__title">{{ isEditing ? 'Modifica Esercizio 3D' : t('editor.title') }}</h1>
      <p class="editor-header__subtitle">
        {{ t('editor.subtitle') }}
      </p>
    </div>

    <div class="editor-layout-grid">
      <!-- Left / Main: 3D Studio & Controls -->
      <div class="editor-studio-card" :class="{ 'fullscreen-mode': isFullscreen }">
        <!-- Top Controls Bar -->
        <div class="editor-top-controls-bar">
          <div class="editor-base-poses-group">
            <select v-model="selectedBasePose" class="md-select editor-base-select" @change="applyBasePose">
              <option value="stand">{{ t('editor.standing') }}</option>
              <option value="sitting">{{ t('editor.seated') }}</option>
              <option value="supine">{{ t('editor.face_up') }}</option>
              <option value="prone">{{ t('editor.face_down') }}</option>
              <option value="side_right">{{ t('editor.side_right') }}</option>
              <option value="side_left">{{ t('editor.side_left') }}</option>
            </select>

            <!-- Rig Action Toggles -->
            <div class="rig-actions-row" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button 
                type="button" 
                class="md-chip toggle" 
                :class="{ active: flags.symmetry }"
                @click="toggleFlag('symmetry')"
              >
                <span class="material-symbols-rounded" style="font-size: 16px;">splitscreen</span>
                <span>{{ t('editor.symmetry') }}</span>
              </button>
              <button 
                type="button" 
                class="md-chip toggle" 
                :class="{ active: flags.onion }"
                @click="toggleFlag('onion')"
              >
                <span class="material-symbols-rounded" style="font-size: 16px;">layers</span>
                <span>{{ t('editor.onion_skin') }}</span>
              </button>
            </div>
          </div>

          <div class="md-segmented-button editor-history-segmented">
            <button 
              type="button" 
              class="md-segmented-button__btn" 
              :disabled="!canUndo" 
              :title="t('editor.undo')"
              @click="handleUndo"
            >
              <span class="material-symbols-rounded" style="font-size: 18px;">undo</span>
            </button>
            <button 
              type="button" 
              class="md-segmented-button__btn" 
              :disabled="!canRedo" 
              :title="t('editor.redo')"
              @click="handleRedo"
            >
              <span class="material-symbols-rounded" style="font-size: 18px;">redo</span>
            </button>
          </div>
        </div>

        <!-- 3D Canvas Viewport -->
        <div class="canvas-viewport-container" :class="{ 'is-fullscreen': isFullscreen }">
          <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>

          <!-- Top Right HUD -->
          <div class="canvas-hud-top-right">
            <button type="button" class="md-btn md-btn-tonal" style="height: 36px; padding: 0 0.75rem; font-size: 0.8rem;" @click="resetCamera">
              <span class="material-symbols-rounded" style="font-size: 18px;">videocam</span>
              <span>{{ t('editor.reset_view') }}</span>
            </button>
            <button type="button" class="md-btn md-btn-tonal" style="height: 36px; padding: 0 0.75rem; font-size: 0.8rem;" @click="toggleFullscreen">
              <span class="material-symbols-rounded" style="font-size: 18px;">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
              <span>{{ isFullscreen ? 'Riduci' : t('editor.fullscreen') }}</span>
            </button>

            <!-- Fullscreen Quick Rig Actions -->
            <template v-if="isFullscreen">
              <div class="md-segmented-button editor-hud-segmented" style="height: 36px;">
                <button
                  type="button"
                  class="md-segmented-button__btn"
                  :class="{ active: flags.onion }"
                  :title="t('editor.onion_skin')"
                  @click="toggleFlag('onion')"
                >
                  <span class="material-symbols-rounded" style="font-size: 18px;">layers</span>
                </button>
                <button
                  type="button"
                  class="md-segmented-button__btn"
                  :class="{ active: flags.symmetry }"
                  :title="t('editor.symmetry')"
                  @click="toggleFlag('symmetry')"
                >
                  <span class="material-symbols-rounded" style="font-size: 18px;">splitscreen</span>
                </button>
              </div>
              <div class="md-segmented-button editor-hud-segmented" style="height: 36px;">
                <button
                  type="button"
                  class="md-segmented-button__btn"
                  :disabled="!canUndo"
                  :title="t('editor.undo')"
                  @click="handleUndo"
                >
                  <span class="material-symbols-rounded" style="font-size: 18px;">undo</span>
                </button>
                <button
                  type="button"
                  class="md-segmented-button__btn"
                  :disabled="!canRedo"
                  :title="t('editor.redo')"
                  @click="handleRedo"
                >
                  <span class="material-symbols-rounded" style="font-size: 18px;">redo</span>
                </button>
              </div>
            </template>

            <button v-if="isDebug" type="button" class="md-btn md-btn-tonal" style="height: 36px; padding: 0 0.75rem; font-size: 0.8rem;" title="Copia la posa corrente (debug)" @click="copyCurrentPose">
              <span class="material-symbols-rounded" style="font-size: 18px;">content_copy</span>
              <span>Copia posa</span>
            </button>

            <button v-if="!isFullscreen" type="button" class="md-btn-icon" style="background-color: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface);" title="Guida Comandi" @click="showHelpModal = true">
              <span class="material-symbols-rounded">help</span>
            </button>
          </div>
        </div>

        <!-- Keyframes Sequence Strip -->
        <div style="margin-top: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--md-sys-color-on-surface);">{{ t('editor.sequence_label') }}</label>
            <span style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant);">Clicca su una posa per selezionarla</span>
          </div>

          <div class="keyframes-strip-container">
            <div 
              v-for="(kf, idx) in keyframes" 
              :key="idx" 
              class="keyframe-card md-ripple-surface"
              :class="{ 
                active: currentKeyframeIndex === idx,
                'is-dragging': dragSourceIndex === idx,
                'drop-before': dropTargetIndex === idx && dropPosition === 'before',
                'drop-after': dropTargetIndex === idx && dropPosition === 'after'
              }"
              draggable="true"
              :title="t('editor.drag_keyframe', { defaultValue: 'Trascina per riordinare' })"
              @click="selectKeyframe(idx)"
              @dragstart="onKeyframeDragStart($event, idx)"
              @dragover="onKeyframeDragOver($event, idx)"
              @dragleave="onKeyframeDragLeave($event, idx)"
              @drop.stop="onKeyframeDrop($event, idx)"
              @dragend="onKeyframeDragEnd"
            >
              <span style="font-size: 0.72rem; font-weight: 700; color: var(--md-sys-color-primary);">{{ idx + 1 }}</span>
              <span style="font-size: 0.85rem; font-weight: 600;">K{{ idx + 1 }}</span>
              <button 
                v-if="keyframes.length > 2" 
                type="button" 
                class="keyframe-card__del" 
                title="Elimina fotogramma" 
                @click.stop="deleteKeyframe(idx)"
              >
                <span class="material-symbols-rounded" style="font-size: 16px;">close</span>
              </button>
            </div>

            <!-- Add Keyframe Button -->
            <button 
              type="button" 
              class="keyframe-add-card md-ripple-surface" 
              title="Aggiungi Fotogramma" 
              @click="addKeyframe"
            >
              <span class="material-symbols-rounded">add</span>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Nuovo</span>
            </button>

            <!-- Clone Keyframe Button -->
            <button 
              type="button" 
              class="keyframe-add-card md-ripple-surface" 
              title="Clona fotogramma selezionato" 
              @click="cloneKeyframe"
            >
              <span class="material-symbols-rounded">content_copy</span>
              <span style="font-size: 0.72rem; font-weight: 600; margin-top: 2px;">Clona</span>
            </button>
          </div>
        </div>

        <!-- Playback & Rig Toolbar -->
        <div class="playback-controls-bar" style="margin-top: 1rem;">
          <div class="playback-controls-row">
            <button type="button" class="md-btn md-btn-filled" style="min-width: 110px;" @click="togglePlay">
              <span class="material-symbols-rounded filled">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
              <span>{{ isPlaying ? 'Pausa' : 'Play' }}</span>
            </button>

            <!-- Duration Slider -->
            <div class="slider-container">
              <div class="slider-header">
                <span>{{ t('editor.duration') }}</span>
                <span style="font-weight: 700;">{{ duration.toFixed(2) }}s</span>
              </div>
              <input 
                v-model.number="duration" 
                type="range" 
                min="0.15" 
                max="2.5" 
                step="0.05" 
                class="m3-range-slider"
                @input="onDurationChange"
              />
            </div>

          </div>
        </div>
      </div>

      <!-- Right: Exercise Metadata & Form -->
      <div class="editor-meta-card">
        <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin-bottom: 1.25rem;">
          {{ t('editor.exercise_info') }}
        </h3>

        <form @submit.prevent="handleSaveExercise">
          <!-- Name -->
          <div class="md-field-group">
            <input 
              v-model="exerciseName" 
              type="text" 
              id="exNameInput" 
              class="md-input" 
              placeholder=" " 
              required
            />
            <label class="md-field-label" for="exNameInput">{{ t('editor.ex_name_label') }}</label>
          </div>

          <!-- Category -->
          <div class="md-field-group">
            <select v-model="exerciseCategory" class="md-select" style="height: 52px; padding: 0.5rem 2rem 0.5rem 0.75rem; font-size: 0.95rem;" @mousedown="stopPlayback" @focus="stopPlayback">
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ getCategoryName(cat.id) }}
              </option>
            </select>
            <label class="md-field-label" style="top: 0; font-size: 0.72rem; color: var(--md-sys-color-primary);">
              {{ t('editor.ex_category_label') }}
            </label>
          </div>

          <!-- Notes -->
          <div class="md-field-group">
            <textarea 
              v-model="exerciseNotes" 
              id="exNotesInput" 
              class="md-input md-textarea" 
              placeholder=" " 
              rows="3"
            ></textarea>
            <label class="md-field-label" for="exNotesInput">{{ t('editor.ex_notes_label') }}</label>
          </div>

          <!-- 3D Equipment / Props Section -->
          <div class="editor-equipment-section" style="margin: 1.25rem 0; padding: 1rem; background: var(--md-sys-color-surface-container); border-radius: 12px; border: 1px solid var(--md-sys-color-outline-variant);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 20px;">fitness_center</span>
                <strong style="font-size: 0.95rem; color: var(--md-sys-color-on-surface);">{{ t('editor.equipment_title') }}</strong>
              </div>
            </div>
            
            <p style="font-size: 0.78rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 0.75rem;">
              {{ t('editor.equipment_subtitle') }}
            </p>

            <!-- Prop Toggle Chips -->
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <!-- Dumbbells Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('dumbbells') }"
                @click="toggleProp('dumbbells')"
              >
                <span>🏋️</span>
                <span>{{ t('editor.prop_dumbbells') }}</span>
              </button>

              <!-- Ankle Weights Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('ankle_weights') }"
                @click="toggleProp('ankle_weights')"
              >
                <span>🦵</span>
                <span>{{ t('editor.prop_ankle_weights') }}</span>
              </button>

              <!-- Elastic Band Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('elastic_band') }"
                @click="toggleProp('elastic_band')"
              >
                <span>➰</span>
                <span>{{ t('editor.prop_elastic_band') }}</span>
              </button>

              <!-- Ball Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('ball') }"
                @click="toggleProp('ball')"
              >
                <span>⚽</span>
                <span>{{ t('editor.prop_ball') }}</span>
              </button>

              <!-- Step Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('step') }"
                @click="toggleProp('step')"
              >
                <span>🪜</span>
                <span>{{ t('editor.prop_step') }}</span>
              </button>

              <!-- Wall Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('wall') }"
                @click="toggleProp('wall')"
              >
                <span>🧱</span>
                <span>{{ t('editor.prop_wall') }}</span>
              </button>

              <!-- Mat Chip -->
              <button
                type="button"
                class="md-chip toggle"
                :class="{ active: hasProp('mat') }"
                @click="toggleProp('mat')"
              >
                <span>🟦</span>
                <span>{{ t('editor.prop_mat') }}</span>
              </button>
            </div>

            <!-- Sub-options for Active Props -->
            <div v-if="hasProp('dumbbells') || hasProp('ankle_weights') || hasProp('elastic_band') || hasProp('ball') || hasProp('step') || hasProp('wall') || hasProp('mat')" style="display: flex; flex-direction: column; gap: 0.65rem; padding-top: 0.65rem; border-top: 1px solid var(--md-sys-color-outline-variant);">
              <!-- Dumbbells Options -->
              <div v-if="hasProp('dumbbells')" style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; flex-wrap: wrap; gap: 0.4rem;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">🏋️ {{ t('editor.prop_dumbbells') }} {{ t('editor.hands_label') }}</span>
                <div class="md-segmented-button" style="height: 32px;">
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getDumbbellHands() === 'both' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setDumbbellHands('both')"
                  >
                    {{ t('editor.hands_both') }}
                  </button>
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getDumbbellHands() === 'left' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setDumbbellHands('left')"
                  >
                    {{ t('editor.hands_left') }}
                  </button>
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getDumbbellHands() === 'right' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setDumbbellHands('right')"
                  >
                    {{ t('editor.hands_right') }}
                  </button>
                </div>
              </div>

              <!-- Ankle Weights Options -->
              <div v-if="hasProp('ankle_weights')" style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; flex-wrap: wrap; gap: 0.4rem;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">🦵 {{ t('editor.prop_ankle_weights') }} {{ t('editor.ankles_label') }}</span>
                <div class="md-segmented-button" style="height: 32px;">
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getAnkleWeightSides() === 'both' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setAnkleWeightSides('both')"
                  >
                    {{ t('editor.hands_both') }}
                  </button>
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getAnkleWeightSides() === 'left' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setAnkleWeightSides('left')"
                  >
                    {{ t('editor.hands_left') }}
                  </button>
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getAnkleWeightSides() === 'right' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setAnkleWeightSides('right')"
                  >
                    {{ t('editor.hands_right') }}
                  </button>
                </div>
              </div>

              <!-- Elastic Band Options -->
              <div v-if="hasProp('elastic_band')" style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; flex-wrap: wrap; gap: 0.4rem;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">➰ {{ t('editor.prop_elastic_band') }} {{ t('editor.elastic_anchor_label') }}</span>
                <div class="md-segmented-button" style="height: 32px;">
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getElasticAnchor() === 'hands' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setElasticAnchor('hands')"
                  >
                    {{ t('editor.elastic_hands') }}
                  </button>
                  <button
                    type="button"
                    class="md-segmented-button__btn"
                    :class="{ selected: getElasticAnchor() === 'knees' }"
                    style="padding: 0 0.5rem; font-size: 0.78rem;"
                    @click="setElasticAnchor('knees')"
                  >
                    {{ t('editor.elastic_knees') }}
                  </button>
                </div>
              </div>

              <!-- Ball Options -->
              <div v-if="hasProp('ball')" style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; padding: 0.6rem; background: var(--md-sys-color-surface); border-radius: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                  <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">⚽ {{ t('editor.prop_ball') }} {{ t('editor.position_label') }}</span>
                  <div class="md-segmented-button" style="height: 32px;">
                    <button
                      type="button"
                      class="md-segmented-button__btn"
                      :class="{ selected: getBallPosition() === 'hands' }"
                      style="padding: 0 0.6rem; font-size: 0.78rem;"
                      @click="setBallPosition('hands')"
                    >
                      {{ t('editor.ball_hands') }}
                    </button>
                    <button
                      type="button"
                      class="md-segmented-button__btn"
                      :class="{ selected: getBallPosition() === 'floor' }"
                      style="padding: 0 0.6rem; font-size: 0.78rem;"
                      @click="setBallPosition('floor')"
                    >
                      {{ t('editor.ball_floor') }}
                    </button>
                  </div>
                </div>

                <!-- Ball floor position controls -->
                <div v-if="getBallPosition() === 'floor'" style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.25rem;">
                  <span style="font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); font-style: italic;">
                    💡 Trascina la palla direttamente sul pavimento 3D o usa i cursori
                  </span>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse X:</span>
                    <input
                      type="range"
                      min="-1.5"
                      max="1.5"
                      step="0.05"
                      :value="getBallCoord('x')"
                      class="m3-range-slider"
                      style="flex: 1;"
                      @input="setBallCoord('x', Number($event.target.value))"
                    />
                    <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getBallCoord('x') > 0 ? '+' : '' }}{{ getBallCoord('x').toFixed(2) }}m</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Y:</span>
                    <input
                      type="range"
                      min="0.16"
                      max="2.3"
                      step="0.05"
                      :value="getBallCoord('y')"
                      class="m3-range-slider"
                      style="flex: 1;"
                      @input="setBallCoord('y', Number($event.target.value))"
                    />
                    <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getBallCoord('y').toFixed(2) }}m</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Z:</span>
                    <input
                      type="range"
                      min="-1.5"
                      max="1.5"
                      step="0.05"
                      :value="getBallCoord('z')"
                      class="m3-range-slider"
                      style="flex: 1;"
                      @input="setBallCoord('z', Number($event.target.value))"
                    />
                    <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getBallCoord('z') > 0 ? '+' : '' }}{{ getBallCoord('z').toFixed(2) }}m</span>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.2rem;">
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                      <span style="font-size: 0.72rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Piano:</span>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setBallCoords(0, 0.40)">Centro</button>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setBallCoords(-0.45, 0.20)">Sinistra</button>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setBallCoords(0.45, 0.20)">Destra</button>
                    </div>
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                      <span style="font-size: 0.72rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Altezza:</span>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setBallCoord('y', 0.16)">Terra</button>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setBallCoord('y', 0.90)">Bacino</button>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setBallCoord('y', 1.35)">Petto</button>
                      <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setBallCoord('y', 1.85)">Alto</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step Options -->
              <div v-if="hasProp('step')" style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; padding: 0.6rem; background: var(--md-sys-color-surface); border-radius: 8px;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">🪜 {{ t('editor.prop_step') }} Posizione</span>

                <span style="font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); font-style: italic;">
                  💡 Trascina il gradino direttamente sul pavimento 3D o usa i cursori
                </span>

                <!-- Step X Slider -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse X:</span>
                  <input
                    type="range"
                    min="-1.5"
                    max="1.5"
                    step="0.05"
                    :value="getStepCoord('x')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setStepCoord('x', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getStepCoord('x') > 0 ? '+' : '' }}{{ getStepCoord('x').toFixed(2) }}m</span>
                </div>

                <!-- Step Y Slider -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Y:</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    :value="getStepCoord('y')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setStepCoord('y', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getStepCoord('y').toFixed(2) }}m</span>
                </div>

                <!-- Step Z Slider -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Z:</span>
                  <input
                    type="range"
                    min="-1.5"
                    max="1.5"
                    step="0.05"
                    :value="getStepCoord('z')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setStepCoord('z', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getStepCoord('z') > 0 ? '+' : '' }}{{ getStepCoord('z').toFixed(2) }}m</span>
                </div>

                <!-- Step Presets (Piano & Altezza) -->
                <div style="display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.2rem;">
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <span style="font-size: 0.72rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Piano:</span>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setStepCoords(0, 0)">Centro</button>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setStepCoords(0, 0.35)">Davanti</button>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.5rem; font-size: 0.72rem;" @click="setStepCoords(0, -0.35)">Dietro</button>
                  </div>
                  <div style="display: flex; gap: 0.35rem; align-items: center;">
                    <span style="font-size: 0.72rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Altezza:</span>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setStepCoord('y', 0)">Terra</button>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setStepCoord('y', 0.15)">Basso</button>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setStepCoord('y', 0.30)">Medio</button>
                    <button type="button" class="md-btn md-btn-tonal" style="height: 26px; padding: 0 0.45rem; font-size: 0.72rem;" @click="setStepCoord('y', 0.50)">Alto</button>
                  </div>
                </div>

                <!-- Step Rotation -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.2rem;">
                  <span style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant);">Rotazione:</span>
                  <div class="md-segmented-button" style="height: 30px;">
                    <button
                      type="button"
                      class="md-segmented-button__btn"
                      :class="{ selected: Math.abs(getStepRotation()) < 0.1 }"
                      style="padding: 0 0.5rem; font-size: 0.74rem;"
                      @click="setStepRotation(0)"
                    >
                      0° Orizzontale
                    </button>
                    <button
                      type="button"
                      class="md-segmented-button__btn"
                      :class="{ selected: Math.abs(getStepRotation() - 1.57) < 0.1 }"
                      style="padding: 0 0.5rem; font-size: 0.74rem;"
                      @click="setStepRotation(1.5708)"
                    >
                      90° Verticale
                    </button>
                  </div>
                </div>
              </div>

              <!-- Wall Options -->
              <div v-if="hasProp('wall')" style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; padding: 0.6rem; background: var(--md-sys-color-surface); border-radius: 8px;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">🧱 {{ t('editor.prop_wall') }} {{ t('editor.position_label') }}</span>

                <span style="font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); font-style: italic;">
                  💡 {{ t('editor.wall_position_hint', { defaultValue: 'Posiziona il muro a destra/sinistra e avanti/dietro' }) }}
                </span>

                <!-- Wall X Slider (left/right) -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse X:</span>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.05"
                    :value="getWallCoord('x')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setWallCoord('x', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getWallCoord('x') > 0 ? '+' : '' }}{{ getWallCoord('x').toFixed(2) }}m</span>
                </div>

                <!-- Wall Z Slider (forward/back) -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Z:</span>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.05"
                    :value="getWallCoord('z')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setWallCoord('z', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getWallCoord('z') > 0 ? '+' : '' }}{{ getWallCoord('z').toFixed(2) }}m</span>
                </div>
              </div>

              <!-- Mat Options -->
              <div v-if="hasProp('mat')" style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem; padding: 0.6rem; background: var(--md-sys-color-surface); border-radius: 8px;">
                <span style="color: var(--md-sys-color-on-surface); font-weight: 600;">🟦 {{ t('editor.prop_mat') }} {{ t('editor.position_label') }}</span>

                <span style="font-size: 0.72rem; color: var(--md-sys-color-on-surface-variant); font-style: italic;">
                  💡 {{ t('editor.mat_position_hint', { defaultValue: 'Posiziona il tappeto a destra/sinistra e avanti/dietro' }) }}
                </span>

                <!-- Mat X Slider (left/right) -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse X:</span>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.05"
                    :value="getMatCoord('x')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setMatCoord('x', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getMatCoord('x') > 0 ? '+' : '' }}{{ getMatCoord('x').toFixed(2) }}m</span>
                </div>

                <!-- Mat Z Slider (forward/back) -->
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; width: 45px; color: var(--md-sys-color-on-surface-variant);">Asse Z:</span>
                  <input
                    type="range"
                    min="-2.5"
                    max="2.5"
                    step="0.05"
                    :value="getMatCoord('z')"
                    class="m3-range-slider"
                    style="flex: 1;"
                    @input="setMatCoord('z', Number($event.target.value))"
                  />
                  <span style="font-size: 0.75rem; font-weight: 600; width: 44px; text-align: right;">{{ getMatCoord('z') > 0 ? '+' : '' }}{{ getMatCoord('z').toFixed(2) }}m</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Private Toggle -->
          <div style="margin: 1.25rem 0;">
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--md-sys-color-surface-container); border-radius: 12px; border: 1px solid var(--md-sys-color-outline-variant);" :style="{ cursor: canManage3D ? 'pointer' : 'default' }">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 24px;">lock</span>
                <div>
                  <strong style="display: block; font-size: 0.95rem; color: var(--md-sys-color-on-surface);">{{ t('editor.private_exercise_label') }}</strong>
                  <span style="display: block; font-size: 0.78rem; color: var(--md-sys-color-on-surface-variant);">{{ t('editor.private_exercise_desc') }}</span>
                </div>
              </div>
              <input 
                v-model="isPrivate" 
                type="checkbox" 
                :disabled="!canManage3D" 
                style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary);"
              />
            </label>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="md-btn md-btn-filled" 
            style="width: 100%; height: 50px; font-size: 1rem;"
            :disabled="isSaving"
          >
            <span class="material-symbols-rounded">save</span>
            <span>{{ isSaving ? 'Salvataggio in corso...' : t('editor.save_btn') }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Help Modal Dialog -->
    <ModalDialog v-model="showHelpModal" :title="t('editor.help_title')">
      <div style="color: var(--md-sys-color-on-surface-variant); font-size: 0.92rem; line-height: 1.6;">
        <div class="canvas-hud-hints" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div>🎯 <strong>{{ t('editor.help_control_points') }}:</strong> <span>{{ t('editor.help_control_points_desc') }}</span></div>
          <div>🔄 <strong>{{ t('editor.help_rotate_view') }}:</strong> <span>{{ t('editor.help_rotate_view_desc') }}</span></div>
          <div>✋ <strong>{{ t('editor.help_pan') }}:</strong> <span>{{ t('editor.help_pan_desc') }}</span></div>
          <div>🔍 <strong>{{ t('editor.help_zoom') }}:</strong> <span>{{ t('editor.help_zoom_desc') }}</span></div>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-filled" @click="showHelpModal = false">{{ t('editor.help_understood') }}</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useCategories } from '../composables/useCategories.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import { Mannequin, BASE_POSES, JOINT_DEFS } from '../mannequin/mannequin.js';
import ModalDialog from '../components/ui/ModalDialog.vue';

const route = useRoute();
const router = useRouter();

const { currentUser, canManage3D } = useAuth();
const { t } = useI18n();
const { categories, getCategoryName } = useCategories();
const { showSnackbar } = useSnackbar();

const canvasRef = ref(null);
let mannequin = null;

const exerciseId = ref(null);
const isEditing = computed(() => !!exerciseId.value);
const exerciseName = ref('');
const exerciseCategory = ref('Cardio');
const exerciseNotes = ref('');
const isPrivate = ref(true);
const isSaving = ref(false);

const selectedBasePose = ref('stand');
const isPlaying = ref(false);
const duration = ref(0.8);
const isFullscreen = ref(false);
const showHelpModal = ref(false);

// Hidden debug mode, enabled via `?debug=true`
const isDebug = computed(() => String(route.query.debug) === 'true');

const canUndo = ref(false);
const canRedo = ref(false);

const keyframes = ref([]);
const currentKeyframeIndex = ref(0);

// Keyframe drag & drop reordering state
const dragSourceIndex = ref(null);
const dropTargetIndex = ref(null);
const dropPosition = ref(null);

const flags = reactive({
  symmetry: true,
  onion: false
});

const equipment = ref([]);

function hasProp(type) {
  return equipment.value.some(item => (typeof item === 'string' ? item === type : item.type === type));
}

function getPropConfig(type) {
  const item = equipment.value.find(item => (typeof item === 'string' ? item === type : item.type === type));
  if (!item) return null;
  return typeof item === 'string' ? { type: item } : item;
}

function toggleProp(type) {
  if (hasProp(type)) {
    equipment.value = equipment.value.filter(item => (typeof item === 'string' ? item !== type : item.type !== type));
  } else {
    if (type === 'dumbbells') {
      equipment.value.push({ type: 'dumbbells', hands: 'both' });
    } else if (type === 'ankle_weights') {
      equipment.value.push({ type: 'ankle_weights', ankles: 'both' });
    } else if (type === 'elastic_band') {
      equipment.value.push({ type: 'elastic_band', anchor: 'hands' });
    } else if (type === 'ball') {
      equipment.value.push({ type: 'ball', position: 'hands', x: 0, y: 0.16, z: 0.40 });
    } else if (type === 'step') {
      equipment.value.push({ type: 'step', position: 'center', x: 0, y: 0, z: 0, rotation: 0 });
    } else if (type === 'wall') {
      equipment.value.push({ type: 'wall', x: 0, z: -0.9 });
    } else if (type === 'mat') {
      equipment.value.push({ type: 'mat', x: 0, z: 0 });
    } else {
      equipment.value.push({ type });
    }
  }
  if (mannequin) {
    mannequin.setEquipment(equipment.value);
  }
}

function getDumbbellHands() {
  const cfg = getPropConfig('dumbbells');
  return (cfg && cfg.hands) || 'both';
}

function setDumbbellHands(hands) {
  const cfg = getPropConfig('dumbbells');
  if (cfg) {
    cfg.hands = hands;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getAnkleWeightSides() {
  const cfg = getPropConfig('ankle_weights');
  return (cfg && cfg.ankles) || 'both';
}

function setAnkleWeightSides(sides) {
  const cfg = getPropConfig('ankle_weights');
  if (cfg) {
    cfg.ankles = sides;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getElasticAnchor() {
  const cfg = getPropConfig('elastic_band');
  return (cfg && cfg.anchor) || 'hands';
}

function setElasticAnchor(anchor) {
  const cfg = getPropConfig('elastic_band');
  if (cfg) {
    cfg.anchor = anchor;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getBallPosition() {
  const cfg = getPropConfig('ball');
  return (cfg && cfg.position) || 'hands';
}

function setBallPosition(pos) {
  const cfg = getPropConfig('ball');
  if (cfg) {
    cfg.position = pos;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getStepPosition() {
  const cfg = getPropConfig('step');
  return (cfg && cfg.position) || 'center';
}

function setStepPosition(pos) {
  const cfg = getPropConfig('step');
  if (cfg) {
    cfg.position = pos;
    if (pos === 'front') {
      cfg.x = 0;
      cfg.z = 0.35;
    } else if (pos === 'center') {
      cfg.x = 0;
      cfg.z = 0;
    }
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getBallCoord(axis) {
  const cfg = getPropConfig('ball');
  if (!cfg) return 0;
  if (axis === 'x') return Number.isFinite(cfg.x) ? cfg.x : 0;
  if (axis === 'y') return Number.isFinite(cfg.y) ? cfg.y : 0.16;
  if (axis === 'z') return Number.isFinite(cfg.z) ? cfg.z : 0.40;
  return 0;
}

function setBallCoord(axis, val) {
  const cfg = getPropConfig('ball');
  if (cfg) {
    cfg[axis] = Math.round(val * 100) / 100;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function setBallCoords(x, z, y) {
  const cfg = getPropConfig('ball');
  if (cfg) {
    cfg.x = x;
    cfg.z = z;
    if (y !== undefined) cfg.y = y;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getStepCoord(axis) {
  const cfg = getPropConfig('step');
  if (!cfg) return 0;
  if (axis === 'x') return Number.isFinite(cfg.x) ? cfg.x : 0;
  if (axis === 'y') return Number.isFinite(cfg.y) ? cfg.y : 0;
  if (axis === 'z') return Number.isFinite(cfg.z) ? cfg.z : 0;
  return 0;
}

function setStepCoord(axis, val) {
  const cfg = getPropConfig('step');
  if (cfg) {
    cfg[axis] = Math.round(val * 100) / 100;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function setStepCoords(x, z, y) {
  const cfg = getPropConfig('step');
  if (cfg) {
    cfg.x = x;
    cfg.z = z;
    if (y !== undefined) cfg.y = y;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function getStepRotation() {
  const cfg = getPropConfig('step');
  return (cfg && Number.isFinite(cfg.rotation)) ? cfg.rotation : 0;
}

function setStepRotation(rad) {
  const cfg = getPropConfig('step');
  if (cfg) {
    cfg.rotation = Math.round(rad * 100) / 100;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

// Wall: movable on the horizontal plane, left/right (X) and forward/back (Z), never up
function getWallCoord(axis) {
  const cfg = getPropConfig('wall');
  if (!cfg) return 0;
  if (axis === 'z') return Number.isFinite(cfg.z) ? cfg.z : -0.9;
  return Number.isFinite(cfg.x) ? cfg.x : 0;
}

function setWallCoord(axis, val) {
  const cfg = getPropConfig('wall');
  if (cfg) {
    cfg[axis] = Math.round(val * 100) / 100;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

// Mat: movable on the horizontal plane, left/right (X) and forward/back (Z), never up
function getMatCoord(axis) {
  const cfg = getPropConfig('mat');
  if (!cfg) return 0;
  if (axis === 'z') return Number.isFinite(cfg.z) ? cfg.z : 0;
  return Number.isFinite(cfg.x) ? cfg.x : 0;
}

function setMatCoord(axis, val) {
  const cfg = getPropConfig('mat');
  if (cfg) {
    cfg[axis] = Math.round(val * 100) / 100;
    if (mannequin) mannequin.setEquipment(equipment.value);
  }
}

function initMannequin() {
  if (!canvasRef.value) return;
  if (mannequin) {
    mannequin.destroy();
    mannequin = null;
  }

  mannequin = new Mannequin(canvasRef.value, {
    enableAnchors: true,
    isEditor: true,
    symmetry: flags.symmetry,
    onion: flags.onion,
    loop: true,
    equipment: equipment.value,
    onEquipmentChange: (updatedEq) => {
      equipment.value = updatedEq.map(item => ({ ...item }));
    },
    onKeyframeChange: () => {
      syncKeyframesFromEngine();
    },
    onPlaybackStep: () => {
      syncPlaybackUI();
    },
    onToast: (msg) => {
      showSnackbar(msg);
    }
  });

  syncKeyframesFromEngine();
  syncPlaybackUI();
}

function syncKeyframesFromEngine() {
  if (!mannequin) return;
  keyframes.value = mannequin.keys.map(k => ({ ...k }));
  currentKeyframeIndex.value = mannequin.curKey;
  canUndo.value = mannequin.history.undo.length > 0;
  canRedo.value = mannequin.history.redo.length > 0;
  isPlaying.value = !!mannequin.playing;
}

function syncPlaybackUI() {
  if (!mannequin) return;
  isPlaying.value = !!mannequin.playing;
  canUndo.value = mannequin.history.undo.length > 0;
  canRedo.value = mannequin.history.redo.length > 0;
}

// Stops playback without starting it (unlike togglePlay).
// Used when opening native dropdowns: the per-frame WebGL render + DOM queries
// can freeze Firefox/Gtk while a native <select> popup is open.
function stopPlayback() {
  if (mannequin && mannequin.playing) {
    mannequin.stop();
    syncPlaybackUI();
  }
}

function selectKeyframe(idx) {
  if (!mannequin) return;
  mannequin.selectKey(idx);
  syncKeyframesFromEngine();
}

function addKeyframe() {
  if (!mannequin) return;
  mannequin.addKey();
  syncKeyframesFromEngine();
}

function duplicateKeyframe(idx) {
  if (!mannequin) return;
  mannequin.dupKey(idx);
  syncKeyframesFromEngine();
}

function cloneKeyframe() {
  if (!mannequin) return;
  mannequin.cloneKey();
  syncKeyframesFromEngine();
}

function deleteKeyframe(idx) {
  if (!mannequin) return;
  mannequin.deleteKey(idx);
  syncKeyframesFromEngine();
}

function onKeyframeDragStart(event, idx) {
  dragSourceIndex.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
  }
}

function onKeyframeDragOver(event, idx) {
  if (dragSourceIndex.value === null) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  const fromIdx = dragSourceIndex.value;
  const rect = event.currentTarget.getBoundingClientRect();
  const position = (event.clientY - rect.top) < rect.height / 2 ? 'before' : 'after';

  // No drop indicator if the move would result in no change
  if (fromIdx === idx || (position === 'before' && idx === fromIdx + 1) || (position === 'after' && idx === fromIdx - 1)) {
    dropTargetIndex.value = null;
    dropPosition.value = null;
    return;
  }

  dropTargetIndex.value = idx;
  dropPosition.value = position;
}

function onKeyframeDragLeave(event, idx) {
  const currentTarget = event.currentTarget;
  if (!currentTarget || !event.relatedTarget || !currentTarget.contains(event.relatedTarget)) {
    if (dropTargetIndex.value === idx) {
      dropTargetIndex.value = null;
      dropPosition.value = null;
    }
  }
}

function onKeyframeDrop(event, idx) {
  event.preventDefault();
  if (dragSourceIndex.value === null) {
    resetKeyframeDrag();
    return;
  }
  const fromIdx = dragSourceIndex.value;
  const position = dropPosition.value || 'before';
  reorderKeyframe(fromIdx, idx, position);
  resetKeyframeDrag();
}

function onKeyframeDragEnd() {
  resetKeyframeDrag();
}

function resetKeyframeDrag() {
  dragSourceIndex.value = null;
  dropTargetIndex.value = null;
  dropPosition.value = null;
}

function reorderKeyframe(fromIdx, targetIdx, position) {
  if (!mannequin) return;

  // Compute the final index after removal (same logic as BuilderView.executeReorder).
  let toIdx = position === 'after' ? targetIdx + 1 : targetIdx;
  if (fromIdx < toIdx) toIdx--;

  if (fromIdx === toIdx) return;

  mannequin.stop();
  mannequin.reorderKeys(fromIdx, toIdx);
  syncKeyframesFromEngine();
}

function togglePlay() {
  if (!mannequin) return;
  if (mannequin.playing) {
    mannequin.stop();
  } else {
    mannequin.play();
  }
  syncKeyframesFromEngine();
}

function applyBasePose() {
  if (!mannequin) return;
  mannequin.applyBase(selectedBasePose.value);
  syncKeyframesFromEngine();
}

function onDurationChange() {
  if (!mannequin) return;
  mannequin.duration = duration.value;
}

function toggleFlag(flagName) {
  if (!mannequin) return;
  flags[flagName] = !flags[flagName];
  mannequin.flags[flagName] = flags[flagName];
  if (flagName === 'onion') {
    mannequin.refreshGhost();
  }
}

function handleUndo() {
  if (mannequin) mannequin.undo();
  syncKeyframesFromEngine();
}

function handleRedo() {
  if (mannequin) mannequin.redo();
  syncKeyframesFromEngine();
}

function resetCamera() {
  if (mannequin) mannequin.resetView();
}

// Serializes the current live pose into the exact object format used by
// BASE_POSES / PRESETS in mannequin.js (e.g. the `sitting` entry).
function formatCurrentPose() {
  const pose = mannequin.capture();
  const fmt = (v) => String(Math.round(v * 1000) / 1000);
  const coord = (name) => {
    const i = JOINT_DEFS.findIndex(d => d[0] === name);
    return `[${fmt(pose[i * 3])}, ${fmt(pose[i * 3 + 1])}, ${fmt(pose[i * 3 + 2])}]`;
  };
  const groups = [
    ['hips', 'spine', 'chest', 'neck', 'head'],
    ['shoulderL', 'elbowL', 'handL'],
    ['shoulderR', 'elbowR', 'handR'],
    ['hipL', 'kneeL', 'footL'],
    ['hipR', 'kneeR', 'footR']
  ];
  const body = groups
    .map(group => '      ' + group.map(name => `${name}: ${coord(name)}`).join(', '))
    .join(',\n');
  return `copied_pose: {\n${body}\n    }`;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    return false;
  }
}

async function copyCurrentPose() {
  if (!mannequin) return;
  const text = formatCurrentPose();
  console.log('[debug] posa corrente:\n' + text);
  const ok = await copyToClipboard(text);
  showSnackbar(ok ? 'Posa copiata negli appunti' : 'Copia non riuscita (controlla la console)');
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  setTimeout(() => {
    if (mannequin) mannequin.resize();
  }, 100);
}

async function loadExercise(id, isDuplicate = false) {
  try {
    const ex = await api.getExerciseById(id);
    if (ex) {
      const copySuffix = t('builder.copy_suffix', { defaultValue: 'Copia' });
      exerciseId.value = isDuplicate ? null : ex.id;
      exerciseName.value = isDuplicate
        ? (ex.name ? `${ex.name} (${copySuffix})` : '')
        : (ex.name || '');
      exerciseCategory.value = ex.category || 'Cardio';
      exerciseNotes.value = ex.notes || '';
      isPrivate.value = isDuplicate
        ? (canManage3D.value ? Boolean(ex.is_private) : true)
        : Boolean(ex.is_private);
      if (ex.duration) {
        duration.value = ex.duration;
      }
      if (ex.equipment) {
        equipment.value = Array.isArray(ex.equipment)
          ? ex.equipment
          : (typeof ex.equipment === 'string' ? JSON.parse(ex.equipment) : []);
      } else {
        equipment.value = [];
      }
      if (mannequin) {
        mannequin.setEquipment(equipment.value);
      }
      if (ex.keyframes && mannequin) {
        const kf = typeof ex.keyframes === 'string' ? JSON.parse(ex.keyframes) : ex.keyframes;
        if (Array.isArray(kf) && kf.length > 0) {
          mannequin.setKeyframes(kf, ex.duration || 0.8);
          syncKeyframesFromEngine();
        }
      }
    }
  } catch (err) {
    showSnackbar('Impossibile caricare l\'esercizio da modificare');
  }
}

async function handleSaveExercise() {
  if (!exerciseName.value.trim()) {
    showSnackbar('Inserisci un nome per l\'esercizio');
    return;
  }
  if (!mannequin || mannequin.keys.length < 2) {
    showSnackbar('Crea almeno 2 fotogrammi chiave per animare l\'esercizio');
    return;
  }

  isSaving.value = true;
  try {
    const trimmedName = exerciseName.value.trim();
    const exerciseData = {
      name: trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1),
      category: exerciseCategory.value,
      notes: exerciseNotes.value.trim(),
      is_private: canManage3D.value ? isPrivate.value : true,
      duration: duration.value || 0.8,
      keyframes: mannequin.keys.map(k => Array.from(k.pose)),
      equipment: equipment.value
    };

    if (exerciseId.value) {
      await api.updateExercise(exerciseId.value, exerciseData);
      showSnackbar('Esercizio 3D aggiornato con successo!');
    } else {
      await api.createExercise(exerciseData);
      showSnackbar('Esercizio 3D salvato con successo!');
    }

    router.push('/library');
  } catch (err) {
    showSnackbar(err.message || 'Errore durante il salvataggio');
  } finally {
    isSaving.value = false;
  }
}

async function initFromRoute() {
  const id = route.query.id;
  const duplicateFrom = route.query.duplicateFrom || route.query.cloneId;
  if (id) {
    await loadExercise(id, false);
  } else if (duplicateFrom) {
    await loadExercise(duplicateFrom, true);
  }
}

watch(
  () => [route.query.id, route.query.duplicateFrom, route.query.cloneId],
  async ([newId, newDup, newClone], [oldId, oldDup, oldClone] = []) => {
    if (newId !== oldId || newDup !== oldDup || newClone !== oldClone) {
      await initFromRoute();
    }
  }
);

onMounted(async () => {
  initMannequin();
  await initFromRoute();
});

onUnmounted(() => {
  if (mannequin) {
    mannequin.stop();
    mannequin.destroy();
    mannequin = null;
  }
});
</script>
