<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100">
    <!-- Header -->
    <div>
      <h1 class="font-display fs-3 fw-bolder text-white tracking-tight mb-1">Safety & Community</h1>
      <p class="small mb-0 text-white-50">Our commitments to keeping Unmute authentic, safe, and pressure-free</p>
    </div>

    <!-- Core Safety Commitments in UCard -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2 text-primary">
          <ShieldCheck class="icon-md" />
          <h2 class="font-display fw-bold fs-6 text-white mb-0">Our Commitments</h2>
        </div>

        <div class="d-flex flex-column gap-3">
          <div class="safety-rule-card p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-border) !important;">
            <strong class="text-white d-block small fw-bold mb-1">1. Zero Pressure for Physical Meetings</strong>
            <p class="extra-small text-white-50 mb-0 lh-base">
              Physical meetings are never required by Unmute. You independently decide whether, when, and how you communicate or meet outside the app.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-border) !important;">
            <strong class="text-white d-block small fw-bold mb-1">2. Privacy First</strong>
            <p class="extra-small text-white-50 mb-0 lh-base">
              We never expose your exact GPS coordinates, email, or private contact details to other users. Only approximate city areas are displayed.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-border) !important;">
            <strong class="text-white d-block small fw-bold mb-1">3. Strict 18+ Age Policy</strong>
            <p class="extra-small text-white-50 mb-0 lh-base">
              Unmute is exclusively for adults. Date of birth is validated server-side, and minors are not permitted on the platform.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border" style="border-color: var(--unmute-border) !important;">
            <strong class="text-white d-block small fw-bold mb-1">4. Zero Tolerance for Abuse & Solicitations</strong>
            <p class="extra-small text-white-50 mb-0 lh-base">
              Unmute is not an escort service, paid companionship marketplace, or commercial platform. Harassment and solicitations result in permanent removal.
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Blocked Users Management in UCard -->
    <UCard variant="default" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2 text-warning">
            <UserX class="icon-md" />
            <h2 class="font-display fw-bold fs-6 text-white mb-0">Blocked Users</h2>
          </div>
          <UBadge variant="warning" size="sm">
            {{ blockedList.length }} blocked
          </UBadge>
        </div>

        <div v-if="loading" class="py-3 d-flex flex-column gap-2">
          <USkeleton type="text" />
          <USkeleton type="text" />
        </div>

        <div v-else-if="blockedList.length === 0" class="small text-muted text-center py-4">
          You haven't blocked any users.
        </div>

        <div v-else class="d-flex flex-column gap-2">
          <div
            v-for="user in blockedList"
            :key="user.id"
            class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-3 border"
            style="border-color: var(--unmute-border) !important;"
          >
            <div class="d-flex align-items-center gap-3">
              <UAvatar
                :src="user.avatarUrl"
                :name="user.displayName"
                size="sm"
              />
              <div>
                <h4 class="small fw-bold text-white mb-0">{{ user.displayName }}</h4>
                <p class="extra-small text-white-50 mb-0">
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

<style scoped>
.extra-small {
  font-size: 0.6875rem;
}

.icon-md {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
