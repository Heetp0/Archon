# ProGuard rules for Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# ProGuard rules for Ktor
-keep class io.ktor.** { *; }
-keep interface io.ktor.** { *; }
-dontwarn io.ktor.**

# ProGuard rules for kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keep,allowdictionarywarnings class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.** {
    *;
}
-keep class * {
    @kotlinx.serialization.Serializable *;
}

# Standard Android Rules
-keepattributes Signature
-keepattributes *Annotation*
-keep class * extends android.app.Application
-keep class * extends android.app.Activity
-keep class * extends android.app.Service
-keep class * extends android.content.BroadcastReceiver
-keep class * extends android.content.ContentProvider
