<template>
  <div class="d-flex flex-column gap-4 w-100">
    <PageHeader title="Matches" subtitle="People who connected with you, too.">
      <template #actions>
        <UBadge variant="primary" size="md">{{ chatStore.matches.length }} matches</UBadge>
      </template>
    </PageHeader>

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

    <!-- Gallery of mutual matches: photo-forward glass tiles -->
    <div v-else class="match-gallery">
      <article
        v-for="(match, index) in chatStore.matches"
        :key="match.matchId"
        class="match-tile glass-pane enter-rise"
        :style="{ '--i': Math.min(index, 8) }"
        role="button"
        tabindex="0"
        :aria-label="`Open chat with ${match.user.displayName}`"
        @click="$router.push(`/chat/${match.conversationId}`)"
        @keydown.enter="$router.push(`/chat/${match.conversationId}`)"
      >
        <div class="tile-photo" :style="photoStyle(match.user.avatarUrl)">
          <span v-if="!match.user.avatarUrl" class="tile-initial">{{ match.user.displayName.charAt(0) }}</span>
          <span v-if="!match.lastMessage" class="tile-new">New</span>
        </div>
        <div class="tile-body">
          <h3 class="tile-name mb-0">{{ match.user.displayName }}, {{ match.user.age }}</h3>
          <p v-if="match.user.approximateLocation" class="tile-area mb-0">{{ match.user.approximateLocation }}</p>
          <p v-if="match.lastMessage" class="tile-last mb-0">{{ match.lastMessage.content }}</p>
          <div v-else-if="match.user.interests?.length" class="d-flex flex-wrap gap-1">
            <span v-for="int in match.user.interests.slice(0, 2)" :key="int" class="tile-pill">{{ int }}</span>
          </div>
          <span class="tile-cta">
            <i class="ri-message-3-line" aria-hidden="true"></i>
            {{ match.lastMessage ? 'Continue conversation' : 'Say hello' }}
          </span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '../components/layout/PageHeader.vue';
import { onMounted } from 'vue';
import UBadge from '../components/ui/UBadge.vue';
import UButton from '../components/ui/UButton.vue';
import UEmptyState from '../components/ui/UEmptyState.vue';
import { useChatStore } from '../stores/chat';

const chatStore = useChatStore();

function photoStyle(url: string) {
  return url ? { backgroundImage: `url("${url.replace(/"/g, '%22')}")` } : {};
}

onMounted(() => {
  chatStore.loadMatches();
});
</script>

<style scoped lang="scss">
.match-gallery {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
}

.match-tile {
  border-radius: var(--unmute-radius-xl);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform var(--unmute-transition-normal), box-shadow var(--unmute-transition-normal);

  &:hover,
  &:focus-visible {
    transform: translateY(-4px);
    box-shadow: var(--unmute-glass-edge), var(--unmute-shadow-3d-hover);
  }
}

.tile-photo {
  position: relative;
  aspect-ratio: 4 / 4.2;
  margin: 0.6rem 0.6rem 0;
  border-radius: calc(var(--unmute-radius-xl) - 0.6rem);
  background-size: cover;
  background-position: center;
  background-image: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.7), transparent 45%),
    linear-gradient(150deg, #c9d3ea 0%, #8f9bbb 60%, #6c7797 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-initial {
  font-family: var(--unmute-font-display);
  font-size: 4rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}

.tile-new {
  position: absolute;
  top: 0.7rem;
  left: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  background: var(--unmute-primary-gradient);
  box-shadow: var(--unmute-glow-primary);
}

.tile-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.9rem 1.1rem 1.1rem;
  flex-grow: 1;
}

.tile-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--unmute-text-primary);
}

.tile-area,
.tile-last {
  font-size: 0.8rem;
  color: var(--unmute-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-pill {
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--unmute-text-secondary);
  background: var(--unmute-glass-surface);
  box-shadow: var(--unmute-glass-edge);
}

.tile-cta {
  margin-top: auto;
  padding-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--unmute-accent-text);
}
</style>
