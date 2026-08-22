(function() {
  if (window.admin) return;

  class AdminController {
    constructor() {
      this.currentUser = null;
      this.users = [];
      this.userToDelete = null;
      this.currentTab = 'users';
      this.selectedBackupData = null;
      this.selectedFileName = '';
      this.eventsInitialized = false;
    }

  async init() {
    if (!document.getElementById('adminPageTitle')) return;

    this.currentUser = await window.API.getMe();

    if (!this.isAdmin()) {
      this.renderAccessDenied();
      return;
    }

    await this.fetchUsers();
    await this.fetchStats();

    if (!this.eventsInitialized) {
      this.initEvents();
      this.eventsInitialized = true;

      window.addEventListener('languageChanged', () => {
        if (!document.getElementById('adminPageTitle')) return;
        this.render();
      });

      window.addEventListener('authChanged', async (e) => {
        if (!document.getElementById('adminPageTitle')) return;
        this.currentUser = e.detail.user;
        if (!this.isAdmin()) {
          this.renderAccessDenied();
        } else {
          await this.fetchUsers();
          await this.fetchStats();
        }
      });
    }
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin' || (this.currentUser.username && this.currentUser.username.toLowerCase() === 'daniele');
  }

  async fetchUsers() {
    try {
      this.users = await window.API.getUsers();
      this.render();
    } catch (err) {
      window.Material3.showSnackbar(err.message || 'Errore nel recupero utenti');
    }
  }

  async fetchStats() {
    try {
      const stats = await window.API.getAdminStats();
      const elUsers = document.getElementById('statUsers');
      const elExercises = document.getElementById('statExercises');
      const elPlans = document.getElementById('statPlans');

      if (elUsers) elUsers.textContent = (stats && stats.users !== undefined) ? stats.users : 0;
      if (elExercises) {
        const totalEx = (stats && stats.exercises !== undefined) ? stats.exercises : ((stats?.standardExercises || 0) + (stats?.customExercises || 0));
        elExercises.textContent = totalEx;
      }
      if (elPlans) elPlans.textContent = (stats && stats.plans !== undefined) ? stats.plans : 0;
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  }

  initEvents() {
    // Backup & Users events
    document.addEventListener('click', (e) => {
      // Tab users
      if (e.target.closest('#tabUsersBtn')) {
        this.currentTab = 'users';
        document.getElementById('tabUsersBtn')?.classList.add('active');
        document.getElementById('tabBackupBtn')?.classList.remove('active');
        const usersSection = document.getElementById('usersSection');
        const backupSection = document.getElementById('backupSection');
        if (usersSection) usersSection.style.display = 'block';
        if (backupSection) backupSection.style.display = 'none';
      }

      // Tab backup
      if (e.target.closest('#tabBackupBtn')) {
        this.currentTab = 'backup';
        document.getElementById('tabBackupBtn')?.classList.add('active');
        document.getElementById('tabUsersBtn')?.classList.remove('active');
        const usersSection = document.getElementById('usersSection');
        const backupSection = document.getElementById('backupSection');
        if (backupSection) backupSection.style.display = 'block';
        if (usersSection) usersSection.style.display = 'none';
        this.fetchStats();
      }

      // Backup Download Button
      if (e.target.closest('#downloadBackupBtn')) {
        this.downloadBackupFile();
      }

      // Dropzone click
      if (e.target.closest('#backupDropzone')) {
        document.getElementById('backupFileInput')?.click();
      }

      // Execute Restore Button
      if (e.target.closest('#executeRestoreBtn')) {
        this.executeRestore();
      }
    });

    document.addEventListener('dragover', (e) => {
      const dropzone = e.target.closest('#backupDropzone');
      if (dropzone) {
        e.preventDefault();
        dropzone.classList.add('dragover');
      }
    });

    document.addEventListener('dragleave', (e) => {
      const dropzone = e.target.closest('#backupDropzone');
      if (dropzone) {
        dropzone.classList.remove('dragover');
      }
    });

    document.addEventListener('drop', (e) => {
      const dropzone = e.target.closest('#backupDropzone');
      if (dropzone) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      }
    });

    // User Role changes & User Deletion
    document.addEventListener('change', async (e) => {
      if (e.target.classList.contains('user-role-select')) {
        const userId = e.target.getAttribute('data-user-id');
        const newRole = e.target.value;

        try {
          await window.API.updateUserRole(userId, newRole);
          window.Material3.showSnackbar('Ruolo utente aggiornato con successo!');
        } catch (err) {
          window.Material3.showSnackbar(err.message || 'Errore durante l\'aggiornamento');
          await this.fetchUsers();
        }
      }
    });

    document.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-action="delete-user"]');
      if (delBtn) {
        const userId = delBtn.getAttribute('data-user-id');
        const user = this.users.find(u => u.id === userId);

        if (this.currentUser && user && user.id === this.currentUser.id) {
          window.Material3.showSnackbar('Non puoi eliminare il tuo stesso account dal pannello!');
          return;
        }

        this.userToDelete = user;
        this.openDeleteDialog(user);
      }

      if (e.target.closest('#confirmDeleteUserBtn')) {
        if (this.userToDelete) {
          try {
            await window.API.deleteUser(this.userToDelete.id);
            window.Material3.closeDialog('deleteUserDialog');
            window.Material3.showSnackbar('Utente eliminato con successo!');
            await this.fetchUsers();
            await this.fetchStats();
          } catch (err) {
            window.Material3.showSnackbar(err.message || 'Impossibile eliminare l\'utente.');
          }
        }
      }

      if (e.target.closest('#cancelDeleteUserBtn') || e.target.closest('#cancelDeleteUserBtnDialog')) {
        window.Material3.closeDialog('deleteUserDialog');
      }
    });
  }

  downloadBackupFile() {
    window.location.href = '/api/admin/backup';
    window.Material3.showSnackbar('Download del backup avviato!');
  }

  handleFileSelected(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      window.Material3.showSnackbar('Seleziona un file con estensione .json');
      return;
    }

    this.selectedFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        this.selectedBackupData = parsed;

        let uCount = 0;
        let exCount = 0;
        let pCount = 0;

        if (Array.isArray(parsed)) {
          exCount = parsed.length;
        } else {
          if (Array.isArray(parsed.users)) uCount = parsed.users.length;
          if (Array.isArray(parsed.custom_exercises)) {
            exCount = parsed.custom_exercises.length;
          } else if (Array.isArray(parsed.all_exercises)) {
            exCount = parsed.all_exercises.length;
          }
          if (Array.isArray(parsed.plans)) pCount = parsed.plans.length;
        }

        const previewBox = document.getElementById('restorePreviewBox');
        const fileNameEl = document.getElementById('previewFileName');
        const fileSizeEl = document.getElementById('previewFileSize');
        const uEl = document.getElementById('previewUsersCount');
        const exEl = document.getElementById('previewExercisesCount');
        const pEl = document.getElementById('previewPlansCount');
        const restoreBtn = document.getElementById('executeRestoreBtn');

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = (file.size / 1024).toFixed(1) + ' KB';
        if (uEl) uEl.textContent = uCount;
        if (exEl) exEl.textContent = exCount;
        if (pEl) pEl.textContent = pCount;

        if (previewBox) previewBox.style.display = 'block';
        if (restoreBtn) {
          restoreBtn.disabled = false;
          restoreBtn.classList.remove('md-btn-tonal');
          restoreBtn.classList.add('md-btn-filled');
        }
      } catch (err) {
        window.Material3.showSnackbar('File JSON non valido: ' + err.message);
        this.selectedBackupData = null;
      }
    };

    reader.readAsText(file);
  }

  async executeRestore() {
    if (!this.selectedBackupData) {
      window.Material3.showSnackbar('Nessun file di backup valido selezionato.');
      return;
    }

    const restoreBtn = document.getElementById('executeRestoreBtn');
    if (restoreBtn) {
      restoreBtn.disabled = true;
      restoreBtn.innerHTML = `
        <span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span>
        Ripristino in corso...
      `;
    }

    try {
      const res = await window.API.restoreBackup(this.selectedBackupData);
      window.Material3.showSnackbar(
        `✅ Database ripristinato con successo! (${res.restored.exercises} esercizi, ${res.restored.plans} schede)`
      );

      await this.fetchStats();
      await this.fetchUsers();

      // Reset selection
      this.selectedBackupData = null;
      const fileInput = document.getElementById('backupFileInput');
      if (fileInput) fileInput.value = '';
      const previewBox = document.getElementById('restorePreviewBox');
      if (previewBox) previewBox.style.display = 'none';

      if (restoreBtn) {
        restoreBtn.disabled = true;
        restoreBtn.classList.remove('md-btn-filled');
        restoreBtn.classList.add('md-btn-tonal');
        restoreBtn.innerHTML = `
          <span class="material-symbols-rounded">sync</span>
          Avvia Ripristino Database
        `;
      }
    } catch (err) {
      window.Material3.showSnackbar('❌ Errore durante il ripristino: ' + err.message);
      if (restoreBtn) {
        restoreBtn.disabled = false;
        restoreBtn.innerHTML = `
          <span class="material-symbols-rounded">sync</span>
          Riprova Ripristino
        `;
      }
    }
  }

  openDeleteDialog(user) {
    if (!user) return;
    const descEl = document.getElementById('deleteUserModalDesc');
    if (descEl) {
      descEl.textContent = `Sei sicuro di voler eliminare l'utente "${user.username}"? Tutti i suoi dati, schede ed esercizi verranno rimossi.`;
    }
    window.Material3.openDialog('deleteUserDialog');
  }

  renderAccessDenied() {
    const container = document.getElementById('adminTableContainer');
    const tabsContainer = document.getElementById('adminTabsContainer');
    if (tabsContainer) tabsContainer.style.display = 'none';
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1.5rem; color: var(--md-sys-color-on-surface-variant);">
        <span class="material-symbols-rounded" style="font-size: 3.5rem; color: var(--md-sys-color-error); margin-bottom: 1rem;">admin_panel_settings</span>
        <h3 style="font-size: 1.4rem; font-weight: 700; color: var(--md-sys-color-on-surface); margin-bottom: 0.5rem;">Accesso Riservato agli Amministratori</h3>
        <p style="max-width: 450px; margin: 0 auto 1.5rem auto;">Effettua l'accesso con un account amministratore per visualizzare e gestire gli utenti della piattaforma o eseguire il backup.</p>
        <button class="md-btn md-btn-filled" id="openAuthAdminBtn">
          <span class="material-symbols-rounded">login</span>
          Accedi
        </button>
      </div>
    `;

    document.getElementById('openAuthAdminBtn')?.addEventListener('click', () => {
      window.Material3.openDialog('authSheetBackdrop');
    });
  }

  render() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const t = window.t || (k => k);

    if (this.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--md-sys-color-on-surface-variant);" data-i18n="admin.no_users">
            ${t('admin.no_users')}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.users.map(u => {
      const createdDate = new Date(u.created_at).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const isSelf = this.currentUser && this.currentUser.id === u.id;
      const roleBadge = u.role === 'admin' 
        ? '<span class="md-badge md-badge-primary" style="font-size: 0.65rem; padding: 1px 6px;">Admin</span>' 
        : (u.role === 'superuser' ? '<span class="md-badge md-badge-super" style="font-size: 0.65rem; padding: 1px 6px;">Super</span>' : '');

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary);">account_circle</span>
              <strong style="font-weight: 600;">${u.username}</strong>
              ${roleBadge}
              ${isSelf ? '<span class="md-badge md-badge-primary" style="font-size: 0.65rem; padding: 1px 4px;">Tu</span>' : ''}
            </div>
          </td>
          <td style="color: var(--md-sys-color-on-surface-variant);">${u.email || '-'}</td>
          <td>
            <select class="md-select user-role-select" data-user-id="${u.id}" ${isSelf ? 'disabled' : ''} style="height: 38px; width: 130px; padding: 0.2rem 1.8rem 0.2rem 0.6rem; font-size: 0.85rem;">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
              <option value="superuser" ${u.role === 'superuser' ? 'selected' : ''}>Super User</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td style="color: var(--md-sys-color-on-surface-variant);">${createdDate}</td>
          <td style="text-align: right;">
            <button type="button" class="md-btn-icon md-btn-danger" data-action="delete-user" data-user-id="${u.id}" ${isSelf ? 'disabled' : ''} title="${t('admin.delete_user_btn')}" aria-label="Elimina">
              <span class="material-symbols-rounded">delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

  window.admin = new AdminController();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.admin.init();
    });
  } else {
    window.admin.init();
  }
  document.addEventListener('turbo:load', () => {
    window.admin.init();
  });
})();
