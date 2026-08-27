<template>
  <main class="content-container">
    <!-- Hero Banner with Action Tiles -->
    <section class="dashboard-hero">
      <div class="dashboard-hero__text">
        <h1 class="dashboard-hero__title">{{ t('dashboard.title') }}</h1>
        <p class="dashboard-hero__subtitle">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>

      <!-- Hero Action Cards -->
      <div class="dashboard-actions-grid">
        <router-link to="/builder" class="hero-action-card hero-action-card--primary md-ripple-surface">
          <div class="hero-action-card__icon">
            <span class="material-symbols-rounded">add_circle</span>
          </div>
          <div class="hero-action-card__content">
            <strong class="hero-action-card__title">{{ t('dashboard.build_plan_btn') }}</strong>
            <span class="hero-action-card__desc">Configura circuiti e intervalli HIIT</span>
          </div>
          <span class="material-symbols-rounded hero-action-card__arrow">arrow_forward</span>
        </router-link>

        <router-link to="/editor" class="hero-action-card hero-action-card--secondary md-ripple-surface">
          <div class="hero-action-card__icon">
            <span class="material-symbols-rounded">accessibility_new</span>
          </div>
          <div class="hero-action-card__content">
            <strong class="hero-action-card__title">{{ t('dashboard.create_ex_btn') }}</strong>
            <span class="hero-action-card__desc">Modella e anima nuovi esercizi 3D</span>
          </div>
          <span class="material-symbols-rounded hero-action-card__arrow">arrow_forward</span>
        </router-link>
      </div>
    </section>

    <!-- Plans Section -->
    <section class="plans-grid" style="display: block;">
      <!-- Logged out & no plans -->
      <div v-if="!currentUser && plans.length === 0 && !loading" class="empty-state-card">
        <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-sys-color-primary); margin-bottom: 0.75rem;">lock</span>
        <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">{{ t('dashboard.empty_plans') }}</h3>
        <p style="color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin: 0 auto 1.5rem auto;">{{ t('dashboard.subtitle') }}</p>
        <button class="md-btn md-btn-filled" @click="$emit('open-auth')">
          <span class="material-symbols-rounded">login</span>
          <span>{{ t('app.auth.login_register') }}</span>
        </button>
      </div>

      <!-- Logged in & 0 plans -->
      <div v-else-if="currentUser && plans.length === 0 && !loading" class="empty-state-card">
        <span class="material-symbols-rounded" style="font-size: 3rem; color: var(--md-sys-color-primary); margin-bottom: 0.75rem;">fitness_center</span>
        <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">{{ t('dashboard.empty_plans') }}</h3>
        <p style="color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin: 0 auto 1.5rem auto;">{{ t('dashboard.subtitle') }}</p>
        <router-link to="/builder" class="md-btn md-btn-filled">
          <span class="material-symbols-rounded">add</span>
          <span>{{ t('dashboard.build_plan_btn') }}</span>
        </router-link>
      </div>

      <!-- Logged in plans view -->
      <div v-else-if="currentUser">
        <!-- Section 1: "Le tue schede" (Assigned or personal) -->
        <div v-if="myAssignedPlans.length > 0" class="dashboard-section" id="myPlansSection" style="margin-bottom: 2rem;">
          <div class="dashboard-section__header">
            <div class="dashboard-section__title-wrap">
              <div class="dashboard-section__icon-wrap">
                <span class="material-symbols-rounded">assignment_ind</span>
              </div>
              <div>
                <h2 class="dashboard-section__title">{{ t('dashboard.my_plans_title', { defaultValue: 'Le tue schede' }) }}</h2>
                <p class="dashboard-section__subtitle">{{ t('dashboard.my_plans_subtitle', { defaultValue: 'Schede HIIT assegnate o create per te' }) }}</p>
              </div>
            </div>
            <span class="md-badge md-badge-primary" style="font-size: 0.8rem; padding: 2px 8px;">{{ myAssignedPlans.length }}</span>
          </div>

          <div class="plans-grid">
            <div v-for="p in myAssignedPlans" :key="p.id" class="plan-card md-ripple-surface">
              <div>
                <div class="plan-card__header">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h3 class="plan-card__title">{{ p.name }}</h3>
                    <div v-if="p.is_assigned && p.author_name" style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
                      <span class="material-symbols-rounded" style="font-size: 14px; color: #81c784;">assignment_ind</span>
                      <span>{{ t('dashboard.assigned_by', { defaultValue: 'Assegnata da' }) }} <strong>{{ p.author_name }}</strong></span>
                    </div>
                    <div v-else-if="p.author_name" style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
                      <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                      <span>{{ p.author_name }}</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <span v-if="p.is_assigned" class="md-badge md-badge-assigned">
                      <span class="material-symbols-rounded" style="font-size: 13px;">assignment_turned_in</span> {{ t('dashboard.assigned_badge', { defaultValue: 'Assegnata' }) }}
                    </span>
                    <span v-else-if="p.is_public" class="md-badge md-badge-public">
                      <span class="material-symbols-rounded" style="font-size: 13px;">public</span> {{ t('dashboard.public_badge', { defaultValue: 'Pubblica' }) }}
                    </span>
                    <span v-else class="md-badge md-badge-private">
                      <span class="material-symbols-rounded" style="font-size: 13px;">lock</span> {{ t('dashboard.private_badge', { defaultValue: 'Personale' }) }}
                    </span>
                    <span class="md-badge md-badge-tertiary">HIIT</span>
                  </div>
                </div>

                <p v-if="p.description" class="plan-card__desc">{{ p.description }}</p>
                <p v-else class="plan-card__desc" style="opacity: 0.5; font-style: italic;">Nessuna descrizione</p>

                <div class="plan-card__stats">
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
                    ~{{ getPlanStats(p).totalMinutes }} min
                  </span>
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">repeat</span>
                    {{ getPlanStats(p).groupsCount }} circuiti ({{ getPlanStats(p).totalRounds }} {{ t('dashboard.rounds', { defaultValue: 'giri' }) }})
                  </span>
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">bolt</span>
                    {{ getPlanStats(p).totalExercises }} {{ t('dashboard.exercises_count', { defaultValue: 'esercizi' }) }}
                  </span>
                </div>
              </div>

              <div class="plan-card__footer">
                <router-link :to="`/player?planId=${p.id}`" class="md-btn md-btn-filled" style="text-decoration: none;">
                  <span class="material-symbols-rounded filled" style="font-size: 18px;">play_arrow</span>
                  <span>{{ t('dashboard.start_workout') }}</span>
                </router-link>
                <div style="display: flex; gap: 0.25rem;">
                  <button type="button" class="md-btn-icon" :title="t('dashboard.share_plan', { defaultValue: 'Condividi Scheda' })" aria-label="Condividi" @click="sharePlan(p)">
                    <span class="material-symbols-rounded">share</span>
                  </button>
                  <template v-if="canEditOrDelete(p)">
                    <router-link :to="`/builder?id=${p.id}`" class="md-btn-icon" title="Modifica Scheda" aria-label="Modifica" style="text-decoration: none;">
                      <span class="material-symbols-rounded">edit</span>
                    </router-link>
                    <button type="button" class="md-btn-icon md-btn-danger" :title="t('dashboard.delete_plan')" aria-label="Elimina" @click="confirmDelete(p)">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: "Schede pubbliche" -->
        <div class="dashboard-section" id="publicPlansSection">
          <div class="dashboard-section__header">
            <div class="dashboard-section__title-wrap">
              <div class="dashboard-section__icon-wrap">
                <span class="material-symbols-rounded">public</span>
              </div>
              <div>
                <h2 class="dashboard-section__title">{{ t('dashboard.public_plans_title', { defaultValue: 'Schede pubbliche' }) }}</h2>
                <p class="dashboard-section__subtitle">{{ t('dashboard.public_plans_subtitle', { defaultValue: 'Allenamenti HIIT della community disponibili per tutti' }) }}</p>
              </div>
            </div>
            <span class="md-badge md-badge-tertiary" style="font-size: 0.8rem; padding: 2px 8px;">{{ publicPlans.length }}</span>
          </div>

          <div v-if="publicPlans.length > 0" class="plans-grid">
            <div v-for="p in publicPlans" :key="p.id" class="plan-card md-ripple-surface">
              <div>
                <div class="plan-card__header">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <h3 class="plan-card__title">{{ p.name }}</h3>
                    <div v-if="p.author_name" style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
                      <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                      <span>{{ p.author_name }}</span>
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <span class="md-badge md-badge-public">
                      <span class="material-symbols-rounded" style="font-size: 13px;">public</span> {{ t('dashboard.public_badge', { defaultValue: 'Pubblica' }) }}
                    </span>
                    <span class="md-badge md-badge-tertiary">HIIT</span>
                  </div>
                </div>

                <p v-if="p.description" class="plan-card__desc">{{ p.description }}</p>
                <p v-else class="plan-card__desc" style="opacity: 0.5; font-style: italic;">Nessuna descrizione</p>

                <div class="plan-card__stats">
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
                    ~{{ getPlanStats(p).totalMinutes }} min
                  </span>
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">repeat</span>
                    {{ getPlanStats(p).groupsCount }} circuiti ({{ getPlanStats(p).totalRounds }} {{ t('dashboard.rounds', { defaultValue: 'giri' }) }})
                  </span>
                  <span class="md-chip">
                    <span class="material-symbols-rounded" style="font-size: 16px;">bolt</span>
                    {{ getPlanStats(p).totalExercises }} {{ t('dashboard.exercises_count', { defaultValue: 'esercizi' }) }}
                  </span>
                </div>
              </div>

              <div class="plan-card__footer">
                <router-link :to="`/player?planId=${p.id}`" class="md-btn md-btn-filled" style="text-decoration: none;">
                  <span class="material-symbols-rounded filled" style="font-size: 18px;">play_arrow</span>
                  <span>{{ t('dashboard.start_workout') }}</span>
                </router-link>
                <div style="display: flex; gap: 0.25rem;">
                  <button type="button" class="md-btn-icon" :title="t('dashboard.share_plan', { defaultValue: 'Condividi Scheda' })" aria-label="Condividi" @click="sharePlan(p)">
                    <span class="material-symbols-rounded">share</span>
                  </button>
                  <template v-if="canEditOrDelete(p)">
                    <router-link :to="`/builder?id=${p.id}`" class="md-btn-icon" title="Modifica Scheda" aria-label="Modifica" style="text-decoration: none;">
                      <span class="material-symbols-rounded">edit</span>
                    </router-link>
                    <button type="button" class="md-btn-icon md-btn-danger" :title="t('dashboard.delete_plan')" aria-label="Elimina" @click="confirmDelete(p)">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state-card">
            <span class="material-symbols-rounded" style="font-size: 2.5rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 0.5rem;">public_off</span>
            <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem;">{{ t('dashboard.no_public_plans', { defaultValue: 'Nessuna scheda pubblica disponibile al momento.' }) }}</p>
          </div>
        </div>
      </div>

      <!-- Logged out with public plans -->
      <div v-else-if="publicPlans.length > 0" class="dashboard-section" id="publicPlansSection">
        <div class="dashboard-section__header">
          <div class="dashboard-section__title-wrap">
            <div class="dashboard-section__icon-wrap">
              <span class="material-symbols-rounded">public</span>
            </div>
            <div>
              <h2 class="dashboard-section__title">{{ t('dashboard.public_plans_title', { defaultValue: 'Schede pubbliche' }) }}</h2>
              <p class="dashboard-section__subtitle">{{ t('dashboard.public_plans_subtitle', { defaultValue: 'Allenamenti HIIT della community disponibili per tutti' }) }}</p>
            </div>
          </div>
          <span class="md-badge md-badge-tertiary" style="font-size: 0.8rem; padding: 2px 8px;">{{ publicPlans.length }}</span>
        </div>

        <div class="plans-grid">
          <div v-for="p in publicPlans" :key="p.id" class="plan-card md-ripple-surface">
            <div>
              <div class="plan-card__header">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <h3 class="plan-card__title">{{ p.name }}</h3>
                  <div v-if="p.author_name" style="font-size: 0.76rem; color: var(--md-sys-color-on-surface-variant); display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-rounded" style="font-size: 14px;">person</span>
                    <span>{{ p.author_name }}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                  <span class="md-badge md-badge-public">
                    <span class="material-symbols-rounded" style="font-size: 13px;">public</span> {{ t('dashboard.public_badge', { defaultValue: 'Pubblica' }) }}
                  </span>
                  <span class="md-badge md-badge-tertiary">HIIT</span>
                </div>
              </div>

              <p v-if="p.description" class="plan-card__desc">{{ p.description }}</p>
              <p v-else class="plan-card__desc" style="opacity: 0.5; font-style: italic;">Nessuna descrizione</p>

              <div class="plan-card__stats">
                <span class="md-chip">
                  <span class="material-symbols-rounded" style="font-size: 16px;">schedule</span>
                  ~{{ getPlanStats(p).totalMinutes }} min
                </span>
                <span class="md-chip">
                  <span class="material-symbols-rounded" style="font-size: 16px;">repeat</span>
                  {{ getPlanStats(p).groupsCount }} circuiti ({{ getPlanStats(p).totalRounds }} {{ t('dashboard.rounds', { defaultValue: 'giri' }) }})
                </span>
                <span class="md-chip">
                  <span class="material-symbols-rounded" style="font-size: 16px;">bolt</span>
                  {{ getPlanStats(p).totalExercises }} {{ t('dashboard.exercises_count', { defaultValue: 'esercizi' }) }}
                </span>
              </div>
            </div>

            <div class="plan-card__footer">
              <router-link :to="`/player?planId=${p.id}`" class="md-btn md-btn-filled" style="text-decoration: none;">
                <span class="material-symbols-rounded filled" style="font-size: 18px;">play_arrow</span>
                <span>{{ t('dashboard.start_workout') }}</span>
              </router-link>
              <button type="button" class="md-btn-icon" :title="t('dashboard.share_plan', { defaultValue: 'Condividi Scheda' })" aria-label="Condividi" @click="sharePlan(p)">
                <span class="material-symbols-rounded">share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Delete Plan Confirmation Dialog -->
    <ModalDialog 
      v-model="showDeleteDialog" 
      :title="t('dashboard.delete_plan')"
    >
      <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
        Sei sicuro di voler eliminare la scheda "{{ planToDelete?.name }}"? L'operazione non è reversibile.
      </p>
      <template #actions>
        <button type="button" class="md-btn md-btn-text" @click="showDeleteDialog = false">{{ t('player.exit') }}</button>
        <button type="button" class="md-btn md-btn-danger" @click="handleDeletePlan">{{ t('dashboard.delete_plan') }}</button>
      </template>
    </ModalDialog>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../services/api.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';
import { useSnackbar } from '../composables/useSnackbar.js';
import ModalDialog from '../components/ui/ModalDialog.vue';

defineEmits(['open-auth']);

const { currentUser, isAdmin, isSuperUser, canManage3D } = useAuth();
const { t } = useI18n();
const { showSnackbar } = useSnackbar();

const plans = ref([]);
const loading = ref(true);
const showDeleteDialog = ref(false);
const planToDelete = ref(null);

const myAssignedPlans = computed(() => {
  if (!currentUser.value) return [];
  return plans.value.filter(p => p.is_assigned || (!p.is_public && p.user_id === currentUser.value.id));
});

const publicPlans = computed(() => {
  return plans.value.filter(p => p.is_public);
});

function canEditOrDelete(p) {
  if (!currentUser.value) return false;
  return p.user_id === currentUser.value.id || canManage3D.value;
}

function getPlanStats(p) {
  const groups = (p.structure && p.structure.groups) || [];
  const groupsCount = groups.length;
  let totalExercises = 0;
  let totalRounds = 0;
  let totalSeconds = 0;

  groups.forEach(g => {
    const reps = Math.max(1, parseInt(g.repetitions, 10) || 1);
    totalRounds += reps;
    const items = g.items || [];
    totalExercises += items.length * reps;

    let groupSeconds = 0;
    items.forEach(item => {
      const isReps = item.type === 'reps';
      const rawTarget = item.target !== undefined ? item.target : (item.target_value !== undefined ? item.target_value : (isReps ? 15 : 40));
      const targetVal = Math.max(0, parseInt(rawTarget, 10) || 0);
      const exerciseDuration = isReps ? (targetVal * 2) : targetVal;
      const rawRest = item.restAfter !== undefined ? item.restAfter : (item.rest_seconds !== undefined ? item.rest_seconds : (item.rest !== undefined ? item.rest : 20));
      const restDuration = Math.max(0, parseInt(rawRest, 10) || 0);
      groupSeconds += (exerciseDuration + restDuration);
    });

    totalSeconds += groupSeconds * reps;
  });

  const totalMinutes = totalSeconds > 0 ? Math.max(1, Math.round(totalSeconds / 60)) : 0;
  return { groupsCount, totalRounds, totalExercises, totalMinutes };
}

async function fetchPlans() {
  loading.value = true;
  try {
    plans.value = await api.getPlans();
  } catch (err) {
    showSnackbar('Errore durante il caricamento delle schede');
  } finally {
    loading.value = false;
  }
}

async function sharePlan(p) {
  const shareUrl = `${window.location.origin}/player?planId=${p.id}`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showSnackbar(t('dashboard.plan_link_copied') || 'Link scheda copiato negli appunti! Condividilo con chi vuoi.');
    } else {
      prompt('Copia il link per condividere la scheda:', shareUrl);
    }
  } catch (err) {
    prompt('Copia il link per condividere la scheda:', shareUrl);
  }
}

function confirmDelete(p) {
  planToDelete.value = p;
  showDeleteDialog.value = true;
}

async function handleDeletePlan() {
  if (!planToDelete.value) return;
  try {
    await api.deletePlan(planToDelete.value.id);
    showDeleteDialog.value = false;
    showSnackbar('Scheda eliminata con successo');
    planToDelete.value = null;
    await fetchPlans();
  } catch (err) {
    showSnackbar(err.message || 'Errore durante l\'eliminazione');
  }
}

onMounted(() => {
  fetchPlans();
});
</script>
