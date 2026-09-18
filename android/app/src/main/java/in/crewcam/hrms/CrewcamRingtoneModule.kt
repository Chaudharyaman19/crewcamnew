package `in`.crewcam.hrms

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class CrewcamRingtoneModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val incomingCallChannelId = "crewcam_incoming_calls"
  private val incomingCallNotificationId = 9101
  private var ringtone: Ringtone? = null

  override fun getName(): String = "CrewcamRingtone"

  private fun ensureIncomingCallChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val channel = NotificationChannel(
      incomingCallChannelId,
      "Incoming calls",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Incoming Crewcam audio and video calls"
      enableVibration(true)
      setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
        android.media.AudioAttributes.Builder()
          .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
    }

    val notificationManager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.createNotificationChannel(channel)
  }

  @ReactMethod
  fun start() {
    try {
      if (ringtone?.isPlaying == true) return
      val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
      ringtone = RingtoneManager.getRingtone(reactContext, uri)
      ringtone?.play()
    } catch (_: Exception) {
      // JS vibration still runs as a fallback.
    }
  }

  @ReactMethod
  fun stop() {
    try {
      ringtone?.stop()
    } catch (_: Exception) {
    } finally {
      ringtone = null
    }
  }

  @ReactMethod
  fun showIncomingCall(
    callerName: String,
    callType: String,
    threadId: String,
    sessionId: String,
  ) {
    try {
      ensureIncomingCallChannel()

      val openUri = Uri.parse(
        "crewcam://call/open?threadId=${Uri.encode(threadId)}&sessionId=${Uri.encode(sessionId)}",
      )
      val launchIntent = Intent(Intent.ACTION_VIEW, openUri, reactContext, MainActivity::class.java)
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

      val pendingIntent = PendingIntent.getActivity(
        reactContext,
        9102,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

      val rejectUri = Uri.parse(
        "crewcam://call/reject?threadId=${Uri.encode(threadId)}&sessionId=${Uri.encode(sessionId)}",
      )
      val rejectIntent = Intent(Intent.ACTION_VIEW, rejectUri, reactContext, MainActivity::class.java)
      rejectIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      val rejectPendingIntent = PendingIntent.getActivity(
        reactContext,
        9103,
        rejectIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

      val isVideo = callType.contains("video", ignoreCase = true)
      val title = if (isVideo) "Incoming video call" else "Incoming audio call"
      val notification = NotificationCompat.Builder(reactContext, incomingCallChannelId)
        .setSmallIcon(reactContext.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(callerName)
        .setCategory(NotificationCompat.CATEGORY_CALL)
        .setPriority(NotificationCompat.PRIORITY_MAX)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setOngoing(true)
        .setAutoCancel(false)
        .setFullScreenIntent(pendingIntent, true)
        .setContentIntent(pendingIntent)
        .setVibrate(longArrayOf(0, 850, 650, 850))
        .addAction(0, "Decline", rejectPendingIntent)
        .build()

      NotificationManagerCompat.from(reactContext).notify(
        incomingCallNotificationId,
        notification,
      )
    } catch (_: Exception) {
      // Ringtone and JS alert still run as fallback.
    }
  }

  @ReactMethod
  fun cancelIncomingCall() {
    try {
      NotificationManagerCompat.from(reactContext).cancel(incomingCallNotificationId)
    } catch (_: Exception) {
    }
  }

  @ReactMethod
  fun setSpeakerphoneOn(enabled: Boolean) {
    try {
      val audioManager =
        reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
      audioManager.isSpeakerphoneOn = enabled
    } catch (_: Exception) {
    }
  }
}
