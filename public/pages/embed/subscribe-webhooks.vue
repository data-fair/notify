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
      {{ $t('logged') }}
    </v-alert>
    <v-alert
      v-else-if="!isAccountAdmin"
      type="error"
      style="display:inline-block;"
      class="my-1"
    >
      {{ $t('admin') }}
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
const { parseSender } = require('~/assets/sender-utils')
export default {
  layout: 'embed',
  computed: {
    ...mapState('session', ['user']),
    ...mapGetters('session', ['isAccountAdmin']),
    topics () {
      const keys = this.$route.query.key.split(',')
      const titles = this.$route.query.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
    },
    sender () {
      if (!this.$route.query.sender) return null
      return parseSender(this.$route.query.sender)
    }
  }
}
</script>

<style lang="css" scoped>
</style>
