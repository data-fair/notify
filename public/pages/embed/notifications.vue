<template>
  <v-container fluid data-iframe-height>
    <div class="title mb-4">
      {{ $tc('notifications', notifications ? notifications.count : 0, {nb: notifications ? notifications.count : 0}) }}
    </div>
    <v-row v-if="notifications">
      <v-col
        v-for="(notification, i) of notifications.results"
        :key="`notification_${i}`" class="pt-0 pb-2" cols="12"
      >
        <v-hover
          v-slot="{ hover }"
        >
          <v-card
            :elevation="hover ? 2 : 0"
            height="85" rounded :href="notification && notification.url" target="_blank" outlined
          >
            <v-card-text class="d-flex justify-space-between">
              <div class="d-flex align-center">
                <v-avatar size="40" class="mr-3 mt-1">
                  <img
                    v-if="notification.icon && notification.icon.length && notification.icon.toString().trim().startsWith('http')"
                    :src="notification.icon"
                    alt="icon"
                  >
                  <v-icon v-else>
                    mdi-bell
                  </v-icon>
                </v-avatar>
                <div class="d-flex align-center flex-column">
                  <div class="black--text subtitle-1" style="align-self: start;">
                    {{ notification.title }}
                  </div>
                  <div v-if="notification.body && notification.body.length" style="align-self: start;">
                    {{ notification.body }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-center justify-center">
                {{ notification.date | date }}
              </div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
    <!--    <pre style="font-size: 10px;">{{ notifications }}</pre>-->
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifications: "Aucune notification | {nb} notifications"
en:
  notifications: "No notification | {nb} notifications"
</i18n>

<script>
import eventBus from "assets/event-bus"
import { mapGetters, mapState } from "vuex"

export default {
  layout: 'embed',
  data: () => ({
    eventBus,
    notifications: null
  }),
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount']),
    channel () {
      return `user:${this.user.id}:notifications`
    }
  },
  async mounted () {
    await this.refresh()
    eventBus.$emit('subscribe', this.channel)
    eventBus.$on(this.channel, notification => {
      this.refresh()
    })
  },
  methods: {
    async refresh () {
      this.notifications = await this.$axios.$get('api/v1/notifications')
    }
  }
}
</script>
