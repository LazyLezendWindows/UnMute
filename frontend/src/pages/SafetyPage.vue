<template>
  <div class="d-flex flex-column gap-4 max-w-xl mx-auto w-100">
    <!-- Header -->
    <div>
      <h1 class="font-display fs-3 fw-bolder tracking-tight mb-1 u-text-primary">Safety & Community</h1>
      <p class="small mb-0 u-text-muted">Our commitments to keeping Unmute authentic, safe, and pressure-free</p>
    </div>

    <!-- Core Safety Commitments in UCard -->
    <UCard variant="elevated" padding="lg">
      <div class="d-flex flex-column gap-3">
        <div class="d-flex align-items-center gap-2 text-primary">
          <i class="ri-shield-check-fill fs-5"></i>
          <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">Our Commitments</h2>
        </div>

        <div class="d-flex flex-column gap-3">
          <div class="safety-rule-card p-3 rounded-3 surface-raised border u-border-glass">
            <strong class="d-block small fw-bold mb-1 u-text-primary">1. Zero Pressure for Physical Meetings</strong>
            <p class="extra-small mb-0 lh-base u-text-secondary">
              Physical meetings are never required by Unmute. You independently decide whether, when, and how you communicate or meet outside the app.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border u-border-glass">
            <strong class="d-block small fw-bold mb-1 u-text-primary">2. Privacy First</strong>
            <p class="extra-small mb-0 lh-base u-text-secondary">
              We never expose your exact GPS coordinates, email, or private contact details to other users. Only approximate city areas are displayed.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border u-border-glass">
            <strong class="d-block small fw-bold mb-1 u-text-primary">3. Strict 18+ Age Policy</strong>
            <p class="extra-small mb-0 lh-base u-text-secondary">
              Unmute is exclusively for adults. Date of birth is validated server-side, and minors are not permitted on the platform.
            </p>
          </div>

          <div class="safety-rule-card p-3 rounded-3 surface-raised border u-border-glass">
            <strong class="d-block small fw-bold mb-1 u-text-primary">4. Zero Tolerance for Abuse & Solicitations</strong>
            <p class="extra-small mb-0 lh-base u-text-secondary">
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
            <i class="ri-user-forbid-line fs-5"></i>
            <h2 class="font-display fw-bold fs-6 mb-0 u-text-primary">Blocked Users</h2>
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
            class="d-flex align-items-center justify-content-between p-3 surface-raised rounded-3 border u-border-glass"
          >
            <div class="d-flex align-items-center gap-3">
              <UAvatar
                :src="user.avatarUrl"
                :name="user.displayName"
                size="sm"
              />
              <div>
                <h4 class="small fw-bold mb-0 u-text-primary">{{ user.displayName }}</h4>
                <p class="extra-small mb-0 u-text-muted">
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
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UBadge from '../components/ui/UBadge.vue';
import UButton from '../components/ui/UButton.vue';
import USkeleton from '../components/ui/USkeleton.vue';
import { api } from '../services/api';
import { BlockedUser } from '../types';
import { useToastStore } from '../stores/toast';

const toast = useToastStore();

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
  } catch (err: any) {
    toast.error(`Couldn't load blocked users. ${err.message}`);
  } finally {
    loading.value = false;
  }
}

async function unblock(blockedId: string) {
  const name = blockedList.value.find((u) => u.blockedId === blockedId)?.displayName || 'User';
  try {
    await api.delete('/safety/block', { data: { targetUserId: blockedId } });
    blockedList.value = blockedList.value.filter((u) => u.blockedId !== blockedId);
    toast.success(`${name} has been unblocked.`);
  } catch (err: any) {
    toast.error(`Couldn't unblock ${name}. ${err.message}`);
  }
}
</script>

<style scoped>
.extra-small {
  font-size: 0.6875rem;
}
</style>
