<template>
  <div class="d-flex flex-column gap-4 max-w-2xl mx-auto w-100">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <h1 class="font-display fs-3 fw-bolder tracking-tight mb-1" style="color: var(--unmute-text-primary);">Your Matches</h1>
        <p class="small mb-0" style="color: var(--unmute-text-muted);">People you connected with mutually</p>
      </div>
      <UBadge variant="primary" size="md">
        {{ chatStore.matches.length }} Matches
      </UBadge>
    </div>

    <!-- Empty State -->
    <UEmptyState
      v-if="chatStore.matches.length === 0"
      title="No matches yet"
      description="When someone you like also likes you back, they will appear here and you can chat freely."
    >
      <template #icon>
        <i class="ri-sparkling-fill fs-2"></i>
      </template>
      <template #action>
        <UButton
          variant="primary"
          size="md"
          @click="$router.push('/discover')"
        >
          <span>Discover People</span>
        </UButton>
      </template>
    </UEmptyState>

    <!-- Matches Grid using Bootstrap 5 row & cols + UCard interactive matching light cards -->
    <div v-else class="row g-3">
      <div
        v-for="match in chatStore.matches"
        :key="match.matchId"
        class="col-12 col-sm-6"
      >
        <UCard
          variant="interactive"
          padding="md"
          class="h-100 d-flex flex-column justify-content-between"
        >
          <div class="d-flex align-items-start gap-3">
            <UAvatar
              :src="match.user.avatarUrl"
              :name="match.user.displayName"
              size="lg"
            />

            <div class="min-w-0 flex-grow-1">
              <h3 class="fw-bold fs-6 text-truncate mb-1" style="color: var(--unmute-text-primary);">
                {{ match.user.displayName }}, {{ match.user.age }}
              </h3>
              <p v-if="match.user.approximateLocation" class="extra-small text-truncate mb-2" style="color: var(--unmute-text-muted);">
                {{ match.user.approximateLocation }}
              </p>

              <!-- Interests -->
              <div v-if="match.user.interests && match.user.interests.length > 0" class="d-flex flex-wrap gap-1 mt-1">
                <UBadge
                  v-for="int in match.user.interests.slice(0, 2)"
                  :key="int"
                  variant="secondary"
                  size="sm"
                >
                  {{ int }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Chat button -->
          <div class="pt-3 mt-auto">
            <UButton
              variant="secondary"
              size="sm"
              block
              @click="$router.push(`/chat/${match.conversationId}`)"
            >
              <i class="ri-message-3-line icon-xs me-2 text-primary"></i>
              <span v-if="match.lastMessage">Continue Conversation</span>
              <span v-else>Say Hello</span>
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import UCard from '../components/ui/UCard.vue';
import UAvatar from '../components/ui/UAvatar.vue';
import UBadge from '../components/ui/UBadge.vue';
import UButton from '../components/ui/UButton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();

onMounted(() => {
  chatStore.loadMatches();
});
</script>

<style scoped>
.extra-small {
  font-size: 0.75rem;
}
.icon-xs {
  font-size: 0.875rem;
  line-height: 1;
}
</style>
