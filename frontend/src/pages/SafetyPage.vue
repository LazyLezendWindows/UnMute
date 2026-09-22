<template>
  <div class="max-w-xl mx-auto w-full space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Safety & Community</h1>
      <p class="text-xs text-slate-400">Our commitments to keeping Unmute authentic, safe, and pressure-free</p>
    </div>

    <!-- Core Safety Commitments in UCard -->
    <UCard variant="elevated" padding="lg" class="space-y-4">
      <div class="flex items-center gap-2 text-brand-400">
        <ShieldCheck class="w-5 h-5" />
        <h2 class="font-bold text-sm text-white">Our Commitments</h2>
      </div>

      <div class="grid grid-cols-1 gap-3 text-xs text-slate-300">
        <div class="p-3.5 bg-slate-850 rounded-2xl border border-slate-750 space-y-1">
          <strong class="text-white block font-bold text-xs">1. Zero Pressure for Physical Meetings</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Physical meetings are never required by Unmute. You independently decide whether, when, and how you communicate or meet outside the app.
          </p>
        </div>

        <div class="p-3.5 bg-slate-850 rounded-2xl border border-slate-750 space-y-1">
          <strong class="text-white block font-bold text-xs">2. Privacy First</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            We never expose your exact GPS coordinates, email, or private contact details to other users. Only approximate city areas are displayed.
          </p>
        </div>

        <div class="p-3.5 bg-slate-850 rounded-2xl border border-slate-750 space-y-1">
          <strong class="text-white block font-bold text-xs">3. Strict 18+ Age Policy</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Unmute is exclusively for adults. Date of birth is validated server-side, and minors are not permitted on the platform.
          </p>
        </div>

        <div class="p-3.5 bg-slate-850 rounded-2xl border border-slate-750 space-y-1">
          <strong class="text-white block font-bold text-xs">4. Zero Tolerance for Abuse & Solicitations</strong>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Unmute is not an escort service, paid companionship marketplace, or commercial platform. Harassment and solicitations result in permanent removal.
          </p>
        </div>
      </div>
    </UCard>

    <!-- Blocked Users Management in UCard -->
    <UCard variant="default" padding="lg" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-amber-400">
          <UserX class="w-5 h-5" />
          <h2 class="font-bold text-sm text-white">Blocked Users</h2>
        </div>
        <UBadge variant="warning" size="sm">
          {{ blockedList.length }} blocked
        </UBadge>
      </div>

      <div v-if="loading" class="py-4 space-y-2">
        <USkeleton type="text" />
        <USkeleton type="text" />
      </div>

      <div v-else-if="blockedList.length === 0" class="text-xs text-slate-500 text-center py-6">
        You haven't blocked any users.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="user in blockedList"
          :key="user.id"
          class="flex items-center justify-between p-3 bg-slate-850 rounded-2xl border border-slate-750"
        >
          <div class="flex items-center gap-3">
            <UAvatar
              :src="user.avatarUrl"
              :name="user.displayName"
              size="sm"
            />
            <div>
              <h4 class="text-xs font-bold text-white">{{ user.displayName }}</h4>
              <p class="text-[10px] text-slate-400">
                {{ user.reason ? `Reason: ${user.reason}` : 'Blocked from discovery & chat' }}
              </p>
            </div>
          </div>

          <UButton
            variant="secondary"
            size="sm"
            @click="unblock(user.blockedId)"
          >
            Unblock
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ShieldCheck, UserX } from 'lucide-vue-next';
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UBadge from '../components/ui/UBadge.vue';
import UButton from '../components/ui/UButton.vue';
import USkeleton from '../components/ui/USkeleton.vue';
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
