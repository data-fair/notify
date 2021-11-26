<template>
  <v-container fluid data-iframe-height>
    <v-row v-if="register">
      <register-device />
    </v-row>
    <v-row>
      <v-col>
        <v-subheader class="px-0" style="height: auto;">
          {{ $tc('notifyMe', topics.length) }}
        </v-subheader>
      </v-col>
    </v-row>
    <v-row v-for="topic in topics" :key="topic.key" class="ma-0">
      <subscribe :topic="topic" :no-sender="!!$route.query.noSender" :icon="$route.query.icon" :url-template="$route.query['url-template']" @register="register = true" />
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
    return { register: false }
  },
  computed: {
    topics () {
      const keys = this.$route.query.key.split(',')
      const titles = this.$route.query.title.split(',')
      return keys.map((key, i) => ({ key, title: titles[i] }))
    }
  }
}
</script>

<style lang="css" scoped>
</style>
