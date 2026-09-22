<template>
  <div class="d-flex flex-column gap-4 max-w-2xl mx-auto w-100 py-2">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between pb-2 border-bottom" style="border-color: var(--unmute-glass-border) !important;">
      <div>
        <h1 class="font-editorial fs-3 fw-bolder tracking-tight mb-1" style="color: var(--unmute-text-primary);">
          Your Matches
        </h1>
        <p class="small mb-0" style="color: var(--unmute-text-muted);">
          Mutual connections ready for genuine conversation
        </p>
      </div>
      <UBadge variant="gold" size="md">
        <i class="ri-sparkling-fill icon-xs me-1"></i>
        <span>{{ chatStore.matches.length }} {{ chatStore.matches.length === 1 ? 'Connection' : 'Connections' }}</span>
      </UBadge>
    </div>

    <!-- Empty State -->
    <UEmptyState
      v-if="chatStore.matches.length === 0"
      title="Your Sanctuary is Quiet"
      description="When someone you connect with also connects back, their profile will appear here in your mutual circle."
    >
      <template #icon>
        <div class="p-3 rounded-circle surface-raised d-inline-flex align-items-center justify-content-center" style="box-shadow: var(--unmute-gold-glow);">
          <i class="ri-voiceprint-line fs-1" style="color: var(--unmute-gold);"></i>
        </div>
      </template>
      <template #action>
        <UButton
          variant="primary"
          size="md"
          @click="$router.push('/discover')"
        >
          <i class="ri-compass-3-line me-2"></i>
          <span>Discover New People</span>
        </UButton>
      </template>
    </UEmptyState>

    <!-- Matches Grid using Bootstrap 5 row & cols + UCard luxury cards -->
    <div v-else class="row g-3">
      <div
        v-for="match in chatStore.matches"
        :key="match.matchId"
        class="col-12 col-sm-6"
      >
        <UCard
          variant="elevated"
          padding="md"
          class="h-100 d-flex flex-column justify-content-between match-card-luxury"
        >
          <div>
            <div class="d-flex align-items-start gap-3">
              <div class="position-relative">
                <UAvatar
                  :src="match.user.avatarUrl"
                  :name="match.user.displayName"
                  size="lg"
                  :border="true"
                />
                <span class="match-online-dot position-absolute bottom-0 end-0 rounded-circle"></span>
              </div>

              <div class="min-w-0 flex-grow-1">
                <div class="d-flex align-items-center gap-1">
                  <h3 class="fw-bold fs-6 text-truncate mb-0 font-editorial" style="color: var(--unmute-text-primary);">
                    {{ match.user.displayName }}, {{ match.user.age }}
                  </h3>
                  <i v-if="match.user.isVerified" class="ri-shield-check-fill text-warning extra-small" title="Verified"></i>
                </div>

                <p v-if="match.user.approximateLocation" class="extra-small text-truncate mb-2 mt-0.5" style="color: var(--unmute-text-muted);">
                  <i class="ri-map-pin-2-line me-0.5"></i>
                  {{ match.user.approximateLocation }}
                </p>

                <!-- Compatibility / Interests pill -->
                <div v-if="match.user.interests && match.user.interests.length > 0" class="d-flex flex-wrap gap-1 mt-1">
                  <UBadge
                    v-for="int in match.user.interests.slice(0, 2)"
                    :key="int"
                    variant="gold"
                    size="sm"
                  >
                    {{ int }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>

          <!-- Chat action button -->
          <div class="pt-3 mt-3 border-top" style="border-color: var(--unmute-glass-border) !important;">
            <UButton
              variant="primary"
              size="sm"
              block
              class="luxury-chat-btn"
              @click="$router.push(`/chat/${match.conversationId}`)"
            >
              <i class="ri-chat-voice-line icon-xs me-2 text-warning"></i>
              <span v-if="match.lastMessage">Continue Conversation</span>
              <span v-else>Open Sanctuary</span>
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

<style scoped lang="scss">
.extra-small {
  font-size: 0.75rem;
}

.icon-xs {
  font-size: 0.875rem;
  line-height: 1;
}

.match-card-luxury {
  border-radius: var(--unmute-radius-lg, 24px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--unmute-shadow-3d-hover), var(--unmute-3d-card-rim);
    border-color: var(--unmute-gold-border) !important;
  }
}

.match-online-dot {
  width: 11px;
  height: 11px;
  background-color: #10b981;
  border: 2px solid #ffffff;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.luxury-chat-btn {
  border-radius: var(--unmute-radius-pill);
}
</style>
