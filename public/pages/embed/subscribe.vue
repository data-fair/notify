<template>
  <v-container fluid data-iframe-height>
    <v-row v-if="register && $route.query.register !== 'false' && registrations && !loading">
      <register-device :registrations="registrations" @register="refresh" />
    </v-row>
    <v-row>
      <v-col>
        <v-subheader class="px-0" style="height: auto;">
          {{ $tc('notifyMe', topics.length) }}
        </v-subheader>
      </v-col>
    </v-row>
    <v-row v-for="topic in topics" :key="topic.key" class="ma-0">
      <subscribe
        v-if="outputs"
        :topic="topic"
        :no-sender="!!$route.query.noSender"
        :icon="$route.query.icon"
        :url-template="$route.query['url-template']"
        :outputs="outputs"
        @register="register = true"
      />
    </v-row>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  notifyMe: " | Me notifier de cet évènement : | Me notifier de ces évènements :"
</i18n>

<script>
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
    topics () {
      const keys = this.$route.query.key.split(',')
      const titles = this.$route.query.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
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
