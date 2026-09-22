<template>
  <div class="max-w-xl mx-auto w-full space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-extrabold text-white tracking-tight">Safety & Community</h1>
      <p class="text-xs text-slate-400">Our commitments to keeping Unmute safe, authentic, and pressure-free</p>
    </div>

    <!-- Core Safety Principles -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div class="flex items-center gap-2 text-brand-400">
        <ShieldCheck class="w-5 h-5" />
        <h2 class="font-bold text-sm text-white">Our Commitments</h2>
      </div>

      <div class="grid grid-cols-1 gap-3 text-xs text-slate-300">
        <div class="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
          <strong class="text-white block font-semibold">1. Zero Pressure for Physical Meetings</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Physical meetings are never required by Unmute. You independently decide whether, when, and how you communicate or meet outside the app.
          </p>
        </div>

        <div class="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
          <strong class="text-white block font-semibold">2. Privacy First</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            We never expose your exact GPS coordinates, email, or sensitive personal data to other users. Only approximate city areas are displayed.
          </p>
        </div>

        <div class="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
          <strong class="text-white block font-semibold">3. Strict 18+ Age Policy</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Unmute is exclusively for adults. Date of birth is validated server-side, and minors are not permitted on the platform.
          </p>
        </div>

        <div class="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-1">
          <strong class="text-white block font-semibold">4. Zero Tolerance for Abuse & Solicitations</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Unmute is not an escort service, paid companionship marketplace, or commercial platform. Harassment, solicitation, and abusive conduct result in permanent removal.
          </p>
        </div>
      </div>
    </div>

    <!-- Blocked Users Management -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-amber-400">
          <UserX class="w-5 h-5" />
          <h2 class="font-bold text-sm text-white">Blocked Users</h2>
        </div>
        <span class="text-xs text-slate-400 font-medium">{{ blockedList.length }} blocked</span>
      </div>

      <div v-if="loading" class="text-xs text-slate-500 text-center py-4">
        Loading blocked list...
      </div>

      <div v-else-if="blockedList.length === 0" class="text-xs text-slate-500 text-center py-4">
        You haven't blocked any users.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="user in blockedList"
          :key="user.id"
          class="flex items-center justify-between p-3 bg-slate-800/60 rounded-2xl border border-slate-800"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                alt="Blocked user"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center font-bold text-xs text-slate-400">
                {{ user.displayName.charAt(0) }}
              </div>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-white">{{ user.displayName }}</h4>
              <p class="text-[10px] text-slate-400">
                {{ user.reason ? `Reason: ${user.reason}` : 'Blocked from discovery & chat' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="unblock(user.blockedId)"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors border border-slate-700"
          >
            Unblock
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ShieldCheck, UserX } from 'lucide-vue-next';
import { api } from '../services/api';
import { BlockedUser } from '../types';

const blockedList = ref<BlockedUser[]>([]);
const loading = ref(false);

onMounted(() => {
  loadBlockedUsers();
});

async function loadBlockedUsers() {
  loading.value = true;
  try {
    const res = await api.get('/safety/blocked');
    blockedList.value = res.data.data;
  } catch (err) {
    console.error('Failed to load blocked users:', err);
  } finally {
    loading.value = false;
  }
}

async function unblock(blockedId: string) {
  try {
    await api.delete('/safety/block', { data: { targetUserId: blockedId } });
    blockedList.value = blockedList.value.filter((u) => u.blockedId !== blockedId);
  } catch (err) {
    console.error('Failed to unblock:', err);
  }
}
</script>
