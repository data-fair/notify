<template>
  <v-container
    fluid
    data-iframe-height
  >
    <v-alert
      v-if="!user"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      Vous devez être connecté pour pouvoir recevoir des notifications.
    </v-alert>
    <template v-else>
      <v-row v-if="register && $route.query.register !== 'false' && registrations && !loading">
        <register-device
          :registrations="registrations"
          @register="refresh"
        />
      </v-row>
      <v-row>
        <v-col>
          <v-subheader
            class="px-0"
            style="height: auto;"
          >
            {{ $tc('notifyMe', topics.length) }}
          </v-subheader>
        </v-col>
      </v-row>
      <v-row
        v-for="topic in topics"
        :key="topic.key"
        class="ma-0"
      >
        <subscribe
          v-if="outputs"
          :topic="topic"
          :no-sender="!!$route.query.noSender"
          :icon="$route.query.icon"
          :url-template="$route.query['url-template']"
          :outputs="outputs"
          :sender="sender"
          @register="register = true"
        />
      </v-row>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifyMe: " | Me notifier de cet évènement : | Me notifier de ces évènements :"
</i18n>

<script>
import { mapState } from 'vuex'
const { parseSender } = require('~/assets/sender-utils')

export default {
  layout: 'embed',
  data () {
    return {
      register: false,
      loading: null,
      registrations: null,
      outputs: null
    }
  },
  computed: {
    ...mapState('session', ['user']),
    topics () {
      const keys = this.$route.query.key.split(',')
      const titles = this.$route.query.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
    },
    sender () {
      if (!this.$route.query.sender) return null
      return parseSender(this.$route.query.sender)
    }
  },
  mounted () {
    this.refresh()
  },
  methods: {
    async refresh () {
      if (this.$route.query.outputs !== 'auto') this.outputs = ['devices', 'email']
      this.loading = true
      this.registrations = await this.$axios.$get('api/v1/push/registrations')
      if (this.$route.query.outputs === 'auto') {
        const outputs = ['email']
        if (this.registrations.find(r => !r.disabled)) outputs.push('devices')
        this.outputs = outputs
      }
      this.loading = false
    }
  }
}
</script>

<style lang="css" scoped>
</style>
