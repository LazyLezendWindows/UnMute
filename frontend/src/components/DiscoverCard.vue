<template>
  <div class="relative w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all">
    <!-- Top photo / image area -->
    <div class="relative h-72 sm:h-80 w-full bg-slate-800 overflow-hidden select-none">
      <img
        v-if="candidate.avatarUrl"
        :src="candidate.avatarUrl"
        :alt="candidate.displayName"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
        <User class="w-16 h-16 stroke-[1.5]" />
        <span class="text-xs mt-2">No photo uploaded</span>
      </div>

      <!-- Gradient overlay for text readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

      <!-- Quick action safety button (Report / Block) -->
      <button
        type="button"
        @click="$emit('openSafety')"
        class="absolute top-3 right-3 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-slate-300 hover:text-white backdrop-blur-md transition-colors"
        title="Report or Block"
      >
        <MoreVertical class="w-4 h-4" />
      </button>

      <!-- Candidate Basic Info Overlay -->
      <div class="absolute bottom-4 left-4 right-4">
        <div class="flex items-center gap-2 flex-wrap">
          <h2 class="text-2xl font-bold text-white tracking-tight">
            {{ candidate.displayName }}, {{ candidate.age }}
          </h2>
          <span
            v-if="candidate.isVerified"
            class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-semibold"
          >
            <CheckCircle2 class="w-3 h-3" />
            Verified
          </span>
        </div>

        <div v-if="candidate.approximateLocation" class="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
          <MapPin class="w-3.5 h-3.5 text-brand-400" />
          <span>{{ candidate.approximateLocation }}</span>
        </div>
      </div>
    </div>

    <!-- Details Body -->
    <div class="p-5 space-y-4 flex-1 flex flex-col justify-between">
      <div class="space-y-4">
        <!-- Common Interests Badge (Conversation First!) -->
        <div
          v-if="candidate.commonInterestsCount > 0"
          class="flex items-center gap-2 p-2.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs"
        >
          <Sparkles class="w-4 h-4 text-brand-400 shrink-0" />
          <span class="font-medium">
            You both like: <strong class="text-white">{{ candidate.commonInterests.join(', ') }}</strong>
          </span>
        </div>

        <!-- Bio / Story -->
        <div v-if="candidate.bio" class="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-2xl border border-slate-800/60">
          <p class="whitespace-pre-line">{{ candidate.bio }}</p>
        </div>

        <!-- Connection Intentions / Interaction Preferences -->
        <div v-if="candidate.interactionPreferences && candidate.interactionPreferences.length > 0">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Looking for
          </span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="pref in candidate.interactionPreferences"
              :key="pref"
              class="px-2.5 py-1 rounded-lg bg-slate-800 text-brand-300 border border-slate-700/80 text-[11px] font-medium"
            >
              {{ pref }}
            </span>
          </div>
        </div>

        <!-- All Interests tags -->
        <div v-if="candidate.interests && candidate.interests.length > 0">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Interests & Hobbies
          </span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="interest in candidate.interests"
              :key="interest.id"
              class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              :class="
                candidate.commonInterests.includes(interest.name)
                  ? 'bg-brand-600/30 text-brand-200 border border-brand-500/40'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-800'
              "
            >
              {{ interest.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons (Pass & Like) -->
      <div class="pt-3 flex items-center justify-center gap-4">
        <!-- Pass Button -->
        <button
          type="button"
          @click="$emit('pass')"
          class="flex-1 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <X class="w-4 h-4 text-slate-400" />
          <span>Pass</span>
        </button>

        <!-- Like Button -->
        <button
          type="button"
          @click="$emit('like')"
          class="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-brand-600 via-purple-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center justify-center gap-2"
        >
          <Heart class="w-4 h-4 fill-white" />
          <span>Connect</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  User,
  MapPin,
  CheckCircle2,
  Sparkles,
  Heart,
  X,
  MoreVertical,
} from 'lucide-vue-next';
import { DiscoveryCandidate } from '../types';

defineProps<{
  candidate: DiscoveryCandidate;
}>();

defineEmits<{
  (e: 'like'): void;
  (e: 'pass'): void;
  (e: 'openSafety'): void;
}>();
</script>
