<template>
  <v-snackbar
    v-if="notification"
    ref="notificationSnackbar"
    v-model="showSnackbar"
    :color="notification.type"
    :timeout="notification.type === 'error' ? 0 : 6000"
    class="notification"
    top
  >
    <div>
      <p v-html="notification.msg" />
      <p
        v-if="notification.errorMsg"
        class="ml-3"
        v-html="notification.errorMsg"
      />
    </div>
    <v-btn
      icon
      @click.native="showSnackbar = false"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn>
  </v-snackbar>
</template>

<script>
import eventBus from '../assets/event-bus'

export default {
  data () {
    return {
      notification: null,
      showSnackbar: false
    }
  },
  mounted () {
    eventBus.$on('notification', async notif => {
      this.showSnackbar = false
      await this.$nextTick()
      if (typeof notif === 'string') notif = { msg: notif }
      if (notif.error) {
        notif.type = 'error'
        const errorMsg = (notif.error.response && (notif.error.response.data || notif.error.response.status)) || notif.error.message || notif.error
        console.error(errorMsg)
        if (!notif.msg) notif.msg = errorMsg
        // notif.errorMsg = errorMsg
      }
      this.notification = notif
      this.showSnackbar = true
    })
  }
}

</script>

<style>

  .notification .v-snack__content {
    height: auto;
  }

  .notification .v-snack__content p {
    margin-bottom: 4px;
    margin-top: 4px;
  }
</style>
