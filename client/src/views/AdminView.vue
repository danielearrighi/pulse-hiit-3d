<template>
  <main class="content-container">
    <!-- Access Denied Card if not admin -->
    <div v-if="!isAdmin" class="empty-state-card" style="margin-top: 2rem;">
      <span class="material-symbols-rounded" style="font-size: 3.5rem; color: var(--md-sys-color-error); margin-bottom: 1rem;">gpp_bad</span>
      <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">Accesso Riservato agli Amministratori</h2>
      <p style="color: var(--md-sys-color-on-surface-variant); max-width: 480px; margin: 0 auto 1.5rem auto;">
        Devi aver effettuato l'accesso con un account di livello amministratore per visualizzare questo pannello.
      </p>
      <router-link to="/" class="md-btn md-btn-filled" style="text-decoration: none;">
        <span class="material-symbols-rounded">home</span>
        <span>Torna alla Dashboard</span>
      </router-link>
    </div>

    <!-- Admin Panel -->
    <div v-else>
      <div class="admin-header">
        <h1 class="admin-header__title">{{ t('admin.title') }}</h1>
        <p class="admin-header__subtitle">
          {{ t('admin.subtitle') }}
        </p>
      </div>

      <!-- Admin Navigation Tabs -->
      <div class="admin-tabs">
        <button 
          type="button" 
          class="admin-tab-btn" 
          :class="{ active: currentTab === 'users' }"
          @click="currentTab = 'users'"
        >
          <span class="material-symbols-rounded">group</span>
          <span>{{ t('admin.tab_users') }}</span>
        </button>
        <button 
          type="button" 
          class="admin-tab-btn" 
          :class="{ active: currentTab === 'backup' }"
          @click="switchTab('backup')"
        >
          <span class="material-symbols-rounded">cloud_sync</span>
          <span>{{ t('admin.tab_backup') }}</span>
        </button>
      </div>

      <!-- Tab 1: Users Management -->
      <div v-if="currentTab === 'users'" id="usersSection">
        <div class="admin-card">
          <!-- User Management Toolbar -->
          <div class="admin-toolbar">
            <div class="admin-search-wrapper">
              <span class="material-symbols-rounded admin-search-icon">search</span>
              <input 
                v-model="userSearchQuery" 
                type="text" 
                class="md-input admin-search-input" 
                :placeholder="t('admin.search_users_placeholder', { defaultValue: 'Cerca utente per nome, email o ruolo...' })"
              />
              <button 
                v-if="userSearchQuery" 
                type="button" 
                class="admin-search-clear" 
                aria-label="Cancella ricerca"
                @click="userSearchQuery = ''"
              >
                <span class="material-symbols-rounded" style="font-size: 18px;">close</span>
              </button>
            </div>
            <div class="admin-user-count">
              <span class="material-symbols-rounded" style="font-size: 18px; color: var(--md-sys-color-primary);">group</span>
              <span>{{ filteredUsers.length }} / {{ users.length }} {{ filteredUsers.length === 1 ? 'utente' : 'utenti' }}</span>
            </div>
          </div>

          <!-- Empty State when filtering returns no results -->
          <div v-if="filteredUsers.length === 0" style="text-align: center; padding: 2.5rem 1rem; color: var(--md-sys-color-on-surface-variant);">
            <span class="material-symbols-rounded" style="font-size: 2.5rem; opacity: 0.6; margin-bottom: 0.5rem; display: block;">person_off</span>
            <p style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;">{{ t('admin.no_users', { defaultValue: 'Nessun utente trovato' }) }}</p>
            <p style="font-size: 0.82rem; opacity: 0.8;">Prova a modificare i termini di ricerca.</p>
          </div>

          <!-- Desktop Table View (min-width: 769px) -->
          <div v-else class="admin-table-container">
            <table class="m3-data-table">
              <thead>
                <tr>
                  <th>{{ t('admin.table_username') }}</th>
                  <th>{{ t('admin.table_email') }}</th>
                  <th>{{ t('admin.table_role') }}</th>
                  <th>{{ t('admin.table_created') }}</th>
                  <th style="text-align: right;">{{ t('admin.table_actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in filteredUsers" :key="u.id">
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <div class="admin-user-avatar" :class="u.role" style="width: 32px; height: 32px; font-size: 0.85rem;">
                        {{ (u.username || '?').charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <strong style="font-size: 0.95rem;">{{ u.username }}</strong>
                        <span v-if="currentUser && u.id === currentUser.id" class="md-badge md-badge-primary" style="font-size: 0.65rem; margin-left: 0.35rem;">Tu</span>
                      </div>
                    </div>
                  </td>
                  <td style="color: var(--md-sys-color-on-surface-variant); font-size: 0.88rem;">{{ u.email || '-' }}</td>
                  <td>
                    <select 
                      :value="u.role" 
                      class="md-select" 
                      style="height: 36px; padding: 0.2rem 1.8rem 0.2rem 0.6rem; font-size: 0.85rem;"
                      @change="handleRoleChange(u, $event.target.value)"
                    >
                      <option value="user">User</option>
                      <option value="superuser">SuperUser</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style="color: var(--md-sys-color-on-surface-variant); font-size: 0.85rem;">
                    {{ formatDate(u.created_at) }}
                  </td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 0.35rem; align-items: center;">
                      <button 
                        type="button" 
                        class="md-btn-icon" 
                        title="Assegna Schede" 
                        @click="openAssignPlansModal(u)"
                      >
                        <span class="material-symbols-rounded">assignment</span>
                      </button>
                      <button 
                        type="button" 
                        class="md-btn-icon" 
                        title="Cambia Password" 
                        @click="openChangePasswordModal(u)"
                      >
                        <span class="material-symbols-rounded">key</span>
                      </button>
                      <button 
                        v-if="u.username !== 'daniele' && (!currentUser || u.id !== currentUser.id)"
                        type="button" 
                        class="md-btn-icon md-btn-danger" 
                        title="Elimina Utente" 
                        @click="confirmDeleteUser(u)"
                      >
                        <span class="material-symbols-rounded">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards View (max-width: 768px) -->
          <div v-if="filteredUsers.length > 0" class="admin-user-cards">
            <div v-for="u in filteredUsers" :key="u.id" class="admin-user-card">
              <div class="admin-user-card__header">
                <div class="admin-user-card__identity">
                  <div class="admin-user-avatar" :class="u.role">
                    {{ (u.username || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div class="admin-user-card__name-box">
                    <div class="admin-user-card__username">
                      <span>{{ u.username }}</span>
                      <span v-if="currentUser && u.id === currentUser.id" class="md-badge md-badge-primary" style="font-size: 0.65rem;">Tu</span>
                    </div>
                    <div class="admin-user-card__email">{{ u.email || 'Nessuna email' }}</div>
                  </div>
                </div>
                <span 
                  class="md-badge" 
                  :class="{
                    'md-badge-error': u.role === 'admin',
                    'md-badge-tertiary': u.role === 'superuser',
                    'md-badge-secondary': u.role === 'user' || !u.role
                  }"
                  style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; flex-shrink: 0;"
                >
                  {{ u.role || 'user' }}
                </span>
              </div>

              <div class="admin-user-card__info-chips">
                <div class="admin-user-info-chip">
                  <span class="material-symbols-rounded">calendar_today</span>
                  <span>{{ formatDate(u.created_at) }}</span>
                </div>
                <div v-if="u.email" class="admin-user-info-chip">
                  <span class="material-symbols-rounded">mail</span>
                  <span>{{ u.email }}</span>
                </div>
              </div>

              <div class="admin-user-card__footer">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <label style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant); font-weight: 500;">Ruolo:</label>
                  <select 
                    :value="u.role" 
                    class="md-select admin-user-role-select" 
                    @change="handleRoleChange(u, $event.target.value)"
                  >
                    <option value="user">User</option>
                    <option value="superuser">SuperUser</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div class="admin-user-card__actions">
                  <button 
                    type="button" 
                    class="md-btn-icon" 
                    title="Assegna Schede" 
                    @click="openAssignPlansModal(u)"
                  >
                    <span class="material-symbols-rounded">assignment</span>
                  </button>
                  <button 
                    type="button" 
                    class="md-btn-icon" 
                    title="Cambia Password" 
                    @click="openChangePasswordModal(u)"
                  >
                    <span class="material-symbols-rounded">key</span>
                  </button>
                  <button 
                    v-if="u.username !== 'daniele' && (!currentUser || u.id !== currentUser.id)"
                    type="button" 
                    class="md-btn-icon md-btn-danger" 
                    title="Elimina Utente" 
                    @click="confirmDeleteUser(u)"
                  >
                    <span class="material-symbols-rounded">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Database Backup & Restore -->
      <div v-if="currentTab === 'backup'" id="backupSection">
        <!-- Live Stats -->
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="admin-stat-icon">
              <span class="material-symbols-rounded">person</span>
            </div>
            <div>
              <div class="admin-stat-value">{{ stats.users !== undefined ? stats.users : '-' }}</div>
              <div class="admin-stat-label">{{ t('admin.stats_users') }}</div>
            </div>
          </div>

          <div class="admin-stat-card">
            <div class="admin-stat-icon">
              <span class="material-symbols-rounded">accessibility_new</span>
            </div>
            <div>
              <div class="admin-stat-value">{{ stats.exercises !== undefined ? stats.exercises : '-' }}</div>
              <div class="admin-stat-label">{{ t('admin.stats_exercises') }}</div>
            </div>
          </div>

          <div class="admin-stat-card">
            <div class="admin-stat-icon">
              <span class="material-symbols-rounded">bolt</span>
            </div>
            <div>
              <div class="admin-stat-value">{{ stats.plans !== undefined ? stats.plans : '-' }}</div>
              <div class="admin-stat-label">{{ t('admin.stats_plans') }}</div>
            </div>
          </div>
        </div>

        <!-- Operations Grid -->
        <div class="backup-grid">
          <!-- Export Card -->
          <div class="backup-box">
            <div>
              <div class="backup-box__title">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">download</span>
                <span>{{ t('admin.backup_export_title') }}</span>
              </div>
              <p class="backup-box__desc">
                {{ t('admin.backup_export_desc') }}
              </p>
              <div style="background-color: var(--md-sys-color-surface-container-high); border-radius: 12px; padding: 0.85rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant);">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <span class="material-symbols-rounded" style="font-size: 18px; color: var(--md-sys-color-primary);">database</span>
                  <strong>Compatibilità:</strong> PostgreSQL 18 & Cloud (Render.com)
                </div>
                <div>Formato JSON strutturato pronto per la migrazione.</div>
              </div>
            </div>

            <button type="button" class="md-btn md-btn-filled" style="width: 100%; height: 48px;" @click="downloadBackup">
              <span class="material-symbols-rounded">file_download</span>
              <span>{{ t('admin.download_backup_btn') }}</span>
            </button>
          </div>

          <!-- Import / Restore Card -->
          <div class="backup-box">
            <div>
              <div class="backup-box__title">
                <span class="material-symbols-rounded" style="color: var(--md-sys-color-tertiary);">upload</span>
                <span>{{ t('admin.backup_import_title') }}</span>
              </div>
              <p class="backup-box__desc">
                {{ t('admin.backup_import_desc') }}
              </p>

              <!-- Hidden input -->
              <input ref="fileInputRef" type="file" accept=".json,application/json,text/json" style="display: none;" @change="handleFileSelected" />

              <!-- Dropzone -->
              <div 
                class="dropzone" 
                :class="{ 'drag-over': isDragging }"
                @click="triggerFileInput"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <span class="material-symbols-rounded" style="font-size: 2.5rem; color: var(--md-sys-color-primary); margin-bottom: 0.5rem;">upload_file</span>
                <div style="font-weight: 600; color: var(--md-sys-color-on-surface); font-size: 0.95rem; margin-bottom: 0.25rem;">
                  {{ t('admin.dropzone_text', { defaultValue: 'Clicca o trascina qui il file JSON di backup' }) }}
                </div>
                <div style="font-size: 0.8rem; color: var(--md-sys-color-on-surface-variant);">
                  Formato supportato: .json
                </div>
              </div>

              <!-- Preview Info Box -->
              <div v-if="backupPreview" class="dropzone-preview" style="margin-top: 1rem; padding: 1rem; background: var(--md-sys-color-surface-container-high); border-radius: 12px;">
                <div style="font-weight: 700; color: var(--md-sys-color-on-surface); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 18px;">check_circle</span>
                  <span>{{ backupPreview.fileName }}</span>
                </div>
                <div class="preview-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--md-sys-color-on-surface-variant);">Dimensione:</span>
                  <strong>{{ backupPreview.fileSize }}</strong>
                </div>
                <div class="preview-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--md-sys-color-on-surface-variant);">Utenti rilevati:</span>
                  <strong>{{ backupPreview.usersCount }}</strong>
                </div>
                <div class="preview-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                  <span style="color: var(--md-sys-color-on-surface-variant);">Esercizi rilevati:</span>
                  <strong>{{ backupPreview.exercisesCount }}</strong>
                </div>
                <div class="preview-row" style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span style="color: var(--md-sys-color-on-surface-variant);">Schede rilevate:</span>
                  <strong>{{ backupPreview.plansCount }}</strong>
                </div>
              </div>
            </div>

            <button 
              type="button" 
              class="md-btn md-btn-tonal" 
              style="width: 100%; height: 48px; margin-top: 1rem;" 
              :disabled="!backupData || isRestoring"
              @click="executeRestore"
            >
              <span class="material-symbols-rounded">sync</span>
              <span>{{ isRestoring ? 'Ripristino in corso...' : t('admin.execute_restore_btn') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Password Modal Dialog -->
    <ModalDialog v-model="showChangePassModal" :title="t('admin.change_password_title')">
      <div v-if="userToChangePass">
        <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.25rem;">
          Imposta una nuova password per l'utente <strong style="color: var(--md-sys-color-on-surface);">{{ userToChangePass.username }}</strong>:
        </p>
        <div class="md-text-field">
          <div style="position: relative; display: flex; align-items: center;">
            <input 
              v-model="newPassword" 
              :type="showPasswordText ? 'text' : 'password'" 
              class="md-input" 
              :placeholder="t('admin.new_password_placeholder', { defaultValue: 'Inserisci nuova password' })"
              autocomplete="new-password"
              style="padding-right: 2.75rem; width: 100%;"
            />
            <button 
              type="button" 
              class="md-btn-icon" 
              style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px;" 
              @click="showPasswordText = !showPasswordText"
            >
              <span class="material-symbols-rounded" style="font-size: 20px;">{{ showPasswordText ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-text" @click="showChangePassModal = false">{{ t('admin.cancel_btn') }}</button>
        <button type="button" class="md-btn md-btn-filled" :disabled="!newPassword.trim()" @click="saveNewPassword">{{ t('admin.save_password_btn') }}</button>
      </template>
    </ModalDialog>

    <!-- Assign Plans Modal Dialog -->
    <ModalDialog v-model="showAssignPlansModal" :title="t('admin.assign_plans_title')" custom-style="max-width: 620px; width: 95%;">
      <div v-if="userToAssignPlans">
        <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.92rem; line-height: 1.45; margin-bottom: 1rem;">
          Seleziona le schede create da Admin o SuperUser da associare all'utente <strong style="color: var(--md-sys-color-on-surface);">{{ userToAssignPlans.username }}</strong>:
        </p>

        <!-- Search bar -->
        <div style="position: relative; margin-bottom: 0.75rem;">
          <span class="material-symbols-rounded" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 20px; color: var(--md-sys-color-on-surface-variant); pointer-events: none;">search</span>
          <input 
            v-model="assignSearchQuery" 
            type="text" 
            class="md-input" 
            :placeholder="t('admin.filter_plans_placeholder', { defaultValue: 'Cerca scheda...' })"
            style="padding-left: 2.5rem; width: 100%; height: 42px; font-size: 0.9rem;"
          />
        </div>

        <!-- Plans Selection List -->
        <div class="assign-plans-container" style="max-height: 340px; overflow-y: auto; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 12px; background: var(--md-sys-color-surface-container-low); padding: 0.5rem;">
          <label 
            v-for="plan in filteredAssignablePlans" 
            :key="plan.id" 
            class="assign-plan-item"
            :class="{ selected: selectedPlanIds.has(plan.id) }"
          >
            <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
              <input 
                type="checkbox" 
                :checked="selectedPlanIds.has(plan.id)" 
                class="assign-plan-item__checkbox"
                @change="togglePlanSelection(plan.id)"
              />
              <div class="assign-plan-item__body">
                <div class="assign-plan-item__title">{{ plan.name }}</div>
                <div v-if="plan.description" class="assign-plan-item__meta">{{ plan.description }}</div>
              </div>
            </div>
            <span class="md-badge md-badge-tertiary" style="font-size: 0.72rem; flex-shrink: 0;">HIIT</span>
          </label>

          <div v-if="filteredAssignablePlans.length === 0" style="text-align: center; padding: 1.5rem; color: var(--md-sys-color-on-surface-variant);">
            Nessuna scheda disponibile per l'assegnazione.
          </div>
        </div>

        <!-- Selection count & buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant); flex-wrap: wrap; gap: 0.5rem;">
          <span>{{ selectedPlanIds.size }} schede selezionate</span>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="md-btn md-btn-text" style="font-size: 0.8rem; padding: 0.2rem 0.5rem; height: auto;" @click="selectAllAssignable">Seleziona tutte</button>
            <button type="button" class="md-btn md-btn-text" style="font-size: 0.8rem; padding: 0.2rem 0.5rem; height: auto;" @click="deselectAllAssignable">Deseleziona tutte</button>
          </div>
        </div>
      </div>
      <template #actions>
        <button type="button" class="md-btn md-btn-text" @click="showAssignPlansModal = false">{{ t('admin.cancel_btn') }}</button>
        <button type="button" class="md-btn md-btn-filled" @click="saveAssignedPlans">{{ t('admin.save_assigned_plans_btn') }}</button>
      </template>
    </ModalDialog>

    <!-- Delete User Confirmation Dialog -->
    <ModalDialog v-model="showDeleteUserModal" :title="t('admin.delete_user_btn')">
      <p style="color: var(--md-sys-color-on-surface-variant); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
        Sei sicuro di voler eliminare l'utente "{{ userToDelete?.username }}"? L'operazione eliminerà anche tutte le sue schede ed esercizi personalizzati.
      </p>
      <template #actions>
        <button type="button" class="md-btn md-btn-text" @click="showDeleteUserModal = false">{{ t('admin.cancel_btn') }}</button>
        <button type="button" class="md-btn md-btn-danger" @click="handleDeleteUser">{{ t('admin.delete_user_btn') }}</button>
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

const { currentUser, isAdmin } = useAuth();
const { t } = useI18n();
const { showSnackbar } = useSnackbar();

const currentTab = ref('users');
const users = ref([]);
const userSearchQuery = ref('');
const stats = ref({});

const filteredUsers = computed(() => {
  let list = users.value || [];
  if (userSearchQuery.value.trim()) {
    const q = userSearchQuery.value.toLowerCase().trim();
    list = list.filter(u => 
      (u.username || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }
  return list;
});

// User deletion
const userToDelete = ref(null);
const showDeleteUserModal = ref(false);

// Change Password
const userToChangePass = ref(null);
const newPassword = ref('');
const showPasswordText = ref(false);
const showChangePassModal = ref(false);

// Assign Plans
const userToAssignPlans = ref(null);
const assignablePlans = ref([]);
const selectedPlanIds = ref(new Set());
const assignSearchQuery = ref('');
const showAssignPlansModal = ref(false);

// Backup & Restore
const fileInputRef = ref(null);
const isDragging = ref(false);
const backupData = ref(null);
const backupPreview = ref(null);
const isRestoring = ref(false);

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch (e) {
    return dateStr;
  }
}

async function fetchUsers() {
  try {
    users.value = await api.getUsers();
  } catch (err) {
    showSnackbar('Impossibile recuperare gli utenti');
  }
}

async function fetchStats() {
  try {
    stats.value = await api.getAdminStats();
  } catch (err) {
    console.warn('Stats error:', err);
  }
}

function switchTab(tab) {
  currentTab.value = tab;
  if (tab === 'backup') {
    fetchStats();
  }
}

async function handleRoleChange(user, newRole) {
  try {
    await api.updateUserRole(user.id, newRole);
    user.role = newRole;
    showSnackbar('Ruolo utente aggiornato con successo!');
  } catch (err) {
    showSnackbar(err.message || 'Impossibile aggiornare il ruolo');
  }
}

function openChangePasswordModal(user) {
  userToChangePass.value = user;
  newPassword.value = '';
  showPasswordText.value = false;
  showChangePassModal.value = true;
}

async function saveNewPassword() {
  if (!userToChangePass.value || !newPassword.value.trim()) return;
  try {
    await api.updateUserPassword(userToChangePass.value.id, newPassword.value.trim());
    showChangePassModal.value = false;
    showSnackbar(`Password per "${userToChangePass.value.username}" aggiornata con successo!`);
  } catch (err) {
    showSnackbar(err.message || 'Impossibile aggiornare la password');
  }
}

function confirmDeleteUser(user) {
  userToDelete.value = user;
  showDeleteUserModal.value = true;
}

async function handleDeleteUser() {
  if (!userToDelete.value) return;
  try {
    await api.deleteUser(userToDelete.value.id);
    showDeleteUserModal.value = false;
    showSnackbar('Utente eliminato con successo!');
    userToDelete.value = null;
    await fetchUsers();
  } catch (err) {
    showSnackbar(err.message || 'Impossibile eliminare l\'utente');
  }
}

async function openAssignPlansModal(user) {
  userToAssignPlans.value = user;
  assignSearchQuery.value = '';
  selectedPlanIds.value = new Set();

  try {
    const allPlans = await api.getPlans();
    // Plans that can be assigned (created by admin or superuser or public)
    assignablePlans.value = allPlans;

    const assigned = await api.getUserAssignedPlans(user.id);
    if (assigned && Array.isArray(assigned.plan_ids)) {
      selectedPlanIds.value = new Set(assigned.plan_ids);
    }

    showAssignPlansModal.value = true;
  } catch (err) {
    showSnackbar('Impossibile caricare le schede assegnate');
  }
}

const filteredAssignablePlans = computed(() => {
  let list = assignablePlans.value || [];
  if (assignSearchQuery.value.trim()) {
    const q = assignSearchQuery.value.toLowerCase().trim();
    list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }
  return list;
});

function togglePlanSelection(planId) {
  if (selectedPlanIds.value.has(planId)) {
    selectedPlanIds.value.delete(planId);
  } else {
    selectedPlanIds.value.add(planId);
  }
}

function selectAllAssignable() {
  filteredAssignablePlans.value.forEach(p => selectedPlanIds.value.add(p.id));
}

function deselectAllAssignable() {
  filteredAssignablePlans.value.forEach(p => selectedPlanIds.value.delete(p.id));
}

async function saveAssignedPlans() {
  if (!userToAssignPlans.value) return;
  try {
    await api.updateUserAssignedPlans(userToAssignPlans.value.id, Array.from(selectedPlanIds.value));
    showAssignPlansModal.value = false;
    showSnackbar('Schede assegnate con successo!');
  } catch (err) {
    showSnackbar(err.message || 'Impossibile salvare le schede assegnate');
  }
}

async function downloadBackup() {
  try {
    const res = await fetch('/api/admin/backup');
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `exercise_planner_backup_${today}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showSnackbar('Backup scaricato con successo!');
  } catch (err) {
    showSnackbar('Errore durante il download del backup');
  }
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

function handleFileSelected(e) {
  if (e.target.files && e.target.files.length > 0) {
    processBackupFile(e.target.files[0]);
  }
}

function handleDrop(e) {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processBackupFile(e.dataTransfer.files[0]);
  }
}

function processBackupFile(file) {
  if (!file.name.endsWith('.json')) {
    showSnackbar('Seleziona un file in formato .json');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      backupData.value = parsed;

      const usersCount = Array.isArray(parsed.users) ? parsed.users.length : (Array.isArray(parsed) ? '-' : 0);
      const exercisesCount = Array.isArray(parsed.exercises) ? parsed.exercises.length : (Array.isArray(parsed) ? parsed.length : 0);
      const plansCount = Array.isArray(parsed.plans) ? parsed.plans.length : 0;
      const fileSize = (file.size / 1024).toFixed(1) + ' KB';

      backupPreview.value = {
        fileName: file.name,
        fileSize,
        usersCount,
        exercisesCount,
        plansCount
      };

      showSnackbar('File di backup caricato con successo!');
    } catch (e) {
      showSnackbar('Il file selezionato non è un JSON valido');
    }
  };
  reader.readAsText(file);
}

async function executeRestore() {
  if (!backupData.value) return;
  isRestoring.value = true;
  try {
    const result = await api.restoreBackup(backupData.value);
    showSnackbar(result.message || 'Ripristino database completato con successo!');
    backupData.value = null;
    backupPreview.value = null;
    await fetchStats();
    await fetchUsers();
  } catch (err) {
    showSnackbar(err.message || 'Errore durante il ripristino del database');
  } finally {
    isRestoring.value = false;
  }
}

onMounted(() => {
  if (isAdmin.value) {
    fetchUsers();
    fetchStats();
  }
});
</script>
