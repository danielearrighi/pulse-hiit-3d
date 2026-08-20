/**
 * Interactive HIIT Plan Builder Controller
 */

class PlanBuilder {
  constructor(appInstance) {
    this.app = appInstance;
    this.groups = [];
    this.availableExercises = [];

    this.container = document.getElementById('groupsContainer');
    this.addGroupBtn = document.getElementById('addGroupBtn');
    this.savePlanBtn = document.getElementById('savePlanBtn');

    this.initEvents();
  }

  setAvailableExercises(exercises) {
    this.availableExercises = exercises || [];
  }

  initEvents() {
    if (this.addGroupBtn) {
      this.addGroupBtn.addEventListener('click', () => this.addGroup());
    }

    if (this.savePlanBtn) {
      this.savePlanBtn.addEventListener('click', () => this.savePlan());
    }
  }

  reset() {
    this.groups = [];
    document.getElementById('planNameInput').value = '';
    document.getElementById('planDescInput').value = '';
    this.addGroup(); // Add initial default group
  }

  addGroup() {
    const groupNum = this.groups.length + 1;
    const group = {
      id: 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: `Circuit ${groupNum}`,
      repetitions: 1,
      items: []
    };

    this.groups.push(group);
    this.render();
  }

  removeGroup(groupId) {
    this.groups = this.groups.filter(g => g.id !== groupId);
    this.render();
  }

  addExerciseToGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    if (this.availableExercises.length === 0) {
      alert('No exercises available. Please wait for exercises to load.');
      return;
    }

    const defaultEx = this.availableExercises[0];

    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      exercise_id: defaultEx.id,
      type: 'reps',
      target_value: 15,
      rest_seconds: 10
    };

    group.items.push(newItem);
    this.render();
  }

  removeExerciseFromGroup(groupId, itemId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;
    group.items = group.items.filter(item => item.id !== itemId);
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    if (this.groups.length === 0) {
      this.container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No exercise groups added yet. Click "Add Group / Circuit" above.</div>`;
      return;
    }

    this.groups.forEach((group, gIdx) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group-card';
      groupEl.innerHTML = `
        <div class="group-header">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <input type="text" class="group-title-input" value="${this.escapeHtml(group.title)}" data-gid="${group.id}" placeholder="Group Title (e.g. Circuit 1)">
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--text-muted);">
              <span>Rounds:</span>
              <input type="number" min="1" max="20" value="${group.repetitions}" class="form-input group-reps-input" data-gid="${group.id}" style="width: 70px; padding: 0.3rem 0.5rem;">
            </div>
          </div>
          <button class="btn btn-danger remove-group-btn" data-gid="${group.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Remove Group</button>
        </div>
        <div class="group-items-list" id="items-${group.id}">
          ${group.items.length === 0 ? '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">No exercises in this group yet.</div>' : ''}
        </div>
        <button class="btn btn-secondary add-ex-btn" data-gid="${group.id}" style="font-size: 0.85rem; padding: 0.4rem 1rem;">+ Add Exercise</button>
      `;

      const itemsListEl = groupEl.querySelector('.group-items-list');

      group.items.forEach((item, iIdx) => {
        const row = document.createElement('div');
        row.className = 'exercise-item-row';

        // Exercises options
        const optionsHtml = this.availableExercises.map(ex => `
          <option value="${ex.id}" ${ex.id === item.exercise_id ? 'selected' : ''}>
            ${this.escapeHtml(ex.name)} (${ex.category})
          </option>
        `).join('');

        row.innerHTML = `
          <div>
            <select class="form-select item-ex-select" data-gid="${group.id}" data-iid="${item.id}">
              ${optionsHtml}
            </select>
          </div>
          <div>
            <select class="form-select item-type-select" data-gid="${group.id}" data-iid="${item.id}">
              <option value="reps" ${item.type === 'reps' ? 'selected' : ''}>Repetitions</option>
              <option value="duration" ${item.type === 'duration' ? 'selected' : ''}>Duration (seconds)</option>
            </select>
          </div>
          <div>
            <input type="number" min="1" max="999" value="${item.target_value}" class="form-input item-target-input" data-gid="${group.id}" data-iid="${item.id}" placeholder="${item.type === 'reps' ? 'Reps' : 'Seconds'}">
          </div>
          <div>
            <input type="number" min="0" max="300" value="${item.rest_seconds}" class="form-input item-rest-input" data-gid="${group.id}" data-iid="${item.id}" placeholder="Rest (s)">
          </div>
          <div>
            <button class="btn btn-danger item-remove-btn" data-gid="${group.id}" data-iid="${item.id}" style="padding: 0.4rem; border-radius: 50%; width: 32px; height: 32px;">✕</button>
          </div>
        `;

        itemsListEl.appendChild(row);
      });

      this.container.appendChild(groupEl);
    });

    this.bindEvents();
  }

  bindEvents() {
    // Group title change
    this.container.querySelectorAll('.group-title-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const g = this.groups.find(x => x.id === gid);
        if (g) g.title = e.target.value;
      });
    });

    // Group reps change
    this.container.querySelectorAll('.group-reps-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const g = this.groups.find(x => x.id === gid);
        if (g) g.repetitions = parseInt(e.target.value, 10) || 1;
      });
    });

    // Remove group
    this.container.querySelectorAll('.remove-group-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gid = e.target.getAttribute('data-gid');
        this.removeGroup(gid);
      });
    });

    // Add exercise to group
    this.container.querySelectorAll('.add-ex-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gid = e.target.getAttribute('data-gid');
        this.addExerciseToGroup(gid);
      });
    });

    // Item Exercise change
    this.container.querySelectorAll('.item-ex-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const iid = e.target.getAttribute('data-iid');
        const item = this.findItem(gid, iid);
        if (item) item.exercise_id = e.target.value;
      });
    });

    // Item Type change
    this.container.querySelectorAll('.item-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const iid = e.target.getAttribute('data-iid');
        const item = this.findItem(gid, iid);
        if (item) {
          item.type = e.target.value;
          item.target_value = item.type === 'reps' ? 15 : 30;
          this.render();
        }
      });
    });

    // Item Target input
    this.container.querySelectorAll('.item-target-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const iid = e.target.getAttribute('data-iid');
        const item = this.findItem(gid, iid);
        if (item) item.target_value = parseInt(e.target.value, 10) || 1;
      });
    });

    // Item Rest input
    this.container.querySelectorAll('.item-rest-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const iid = e.target.getAttribute('data-iid');
        const item = this.findItem(gid, iid);
        if (item) item.rest_seconds = parseInt(e.target.value, 10) || 0;
      });
    });

    // Item Remove button
    this.container.querySelectorAll('.item-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gid = e.target.getAttribute('data-gid');
        const iid = e.target.getAttribute('data-iid');
        this.removeExerciseFromGroup(gid, iid);
      });
    });
  }

  findItem(groupId, itemId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return null;
    return group.items.find(i => i.id === itemId);
  }

  escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async savePlan() {
    const name = document.getElementById('planNameInput').value.trim();
    const description = document.getElementById('planDescInput').value.trim();

    if (!name) {
      alert('Please enter a Plan Name.');
      return;
    }

    if (this.groups.length === 0) {
      alert('Please add at least one group to the plan.');
      return;
    }

    for (let gIdx = 0; gIdx < this.groups.length; gIdx++) {
      const g = this.groups[gIdx];
      if (g.items.length === 0) {
        alert(`Group "${g.title}" has no exercises. Please add at least one exercise or remove the group.`);
        return;
      }
    }

    try {
      const payload = {
        name,
        description,
        groups: this.groups.map(g => ({
          title: g.title,
          repetitions: g.repetitions,
          items: g.items.map(item => ({
            exercise_id: item.exercise_id,
            type: item.type,
            target_value: item.target_value,
            rest_seconds: item.rest_seconds
          }))
        }))
      };

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save plan.');
      }

      alert('HIIT Plan created successfully!');
      this.app.fetchPlans();
      this.app.switchTab('dashboard');
    } catch (err) {
      alert('Error saving plan: ' + err.message);
    }
  }
}

window.PlanBuilder = PlanBuilder;
