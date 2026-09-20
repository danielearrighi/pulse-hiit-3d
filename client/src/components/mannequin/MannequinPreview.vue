<template>
  <div ref="wrapRef" class="mannequin-preview-wrapper" style="width: 100%; height: 100%; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
    <canvas ref="canvasRef" style="width: 100%; height: 100%; display: block;"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Mannequin } from '../../mannequin/mannequin.js';

const props = defineProps({
  keyframes: {
    type: [Array, String],
    default: () => []
  },
  duration: {
    type: Number,
    default: 0.8
  },
  autoPlay: {
    type: Boolean,
    default: true
  },
  equipment: {
    type: [Array, String],
    default: () => []
  }
});

const wrapRef = ref(null);
const canvasRef = ref(null);
let mannequin = null;
let resizeObserver = null;

function parseKeyframes(kf) {
  if (!kf) return [];
  if (typeof kf === 'string') {
    try {
      return JSON.parse(kf);
    } catch (e) {
      return [];
    }
  }
  return kf;
}

function parseEquipment(eq) {
  if (!eq) return [];
  if (typeof eq === 'string') {
    try {
      return JSON.parse(eq);
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(eq) ? eq : [];
}

function updateAnimation() {
  if (!mannequin) return;
  mannequin.setEquipment(parseEquipment(props.equipment));
  const parsed = parseKeyframes(props.keyframes);
  if (Array.isArray(parsed) && parsed.length > 0) {
    mannequin.setKeyframes(parsed, props.duration || 0.8);
    if (props.autoPlay) {
      mannequin.play();
    } else {
      mannequin.stop();
      if (mannequin.keys[0]) mannequin.apply(mannequin.keys[0].pose);
    }
  }
}

onMounted(() => {
  if (canvasRef.value) {
    mannequin = new Mannequin(canvasRef.value, {
      enableAnchors: false,
      isEditor: false,
      symmetry: false,
      lockFeet: true,
      onion: false,
      equipment: parseEquipment(props.equipment)
    });
    updateAnimation();
    nextTick(() => {
      if (mannequin) mannequin.resize();
    });
    setTimeout(() => {
      if (mannequin) mannequin.resize();
    }, 250);

    if (wrapRef.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mannequin) mannequin.resize();
      });
      resizeObserver.observe(wrapRef.value);
    }
  }
});

watch(() => [props.keyframes, props.duration, props.equipment], () => {
  updateAnimation();
}, { deep: true });

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (mannequin) {
    mannequin.stop();
    mannequin.destroy();
    mannequin = null;
  }
});
</script>
