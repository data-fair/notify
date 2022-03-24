<template>
  <div
    class="container"
    data-iframe-height
  >
    <v-row
      justify="center"
      class="my-1"
    >
      <v-alert
        type="error"
        style="display:inline-block"
        outlined
        border="left"
      >
        {{ (error.response && error.response.data) || error.message || error }}
      </v-alert>
    </v-row>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  layout: 'embed',
  props: ['error'],
  computed: {
    ...mapState('session', ['user'])
  }
}
</script>
