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
      {{ $t(logged) }}
    </v-alert>
    <v-alert
      v-else-if="activeAccount.type !== 'user' && activeAccount.role !== 'admin'"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      {{ $t(admin) }}
    </v-alert>
    <template v-else>
      <template v-for="topic in topics">
        <v-row :key="'title-' + topic.key">
          <v-col>
            <v-subheader
              class="px-0"
              style="height: auto;"
            >
              {{ $t('webhooks', topic) }}
            </v-subheader>
          </v-col>
        </v-row>
        <v-row
          :key="topic.key"
          class="ma-0"
        >
          <subscribe-webhook
            :topic="topic"
            :no-sender="!!$route.query.noSender"
            :sender="sender"
          />
        </v-row>
      </template>
    </template>
  </v-container>
</template>

<i18n lang="yaml">
fr:
  logged: Vous devez être connecté pour pouvoir configurer des Webhooks.
  admin: Vous devez être administrateur pour pouvoir configurer des Webhooks.
  webhooks: "Configurer des Webhooks pour l'évènement {title}"
</i18n>

<script>
import { mapState, mapGetters } from 'vuex'
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
    ...mapGetters('session', ['activeAccount']),
    topics () {
      const keys = this.$route.query.key.split(',')
      const titles = this.$route.query.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
    },
    sender () {
      if (!this.$route.query.sender) return null
      const [type, id] = this.$route.query.sender.split(':')
      return { type, id }
    }
  },
  mounted () {
    this.refresh()
  },
  methods: {
    async refresh () {
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
