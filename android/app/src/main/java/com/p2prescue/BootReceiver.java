package com.p2prescue;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.d(TAG, "Device booted, starting P2PRescue background mesh services.");
            
            // In a full production app, this would start a native Service
            // that launches React Native Headless JS to run MeshForegroundService.
            // For MVP/Demo purposes, we broadcast an intent or rely on Android's
            // periodic WorkManager which respects boot completion.
            
            // Typical implementation to start a headless JS bundle:
            // Intent serviceIntent = new Intent(context, MyHeadlessJsTaskService.class);
            // context.startForegroundService(serviceIntent);
        }
    }
}
