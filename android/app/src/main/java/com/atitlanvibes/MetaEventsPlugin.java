package com.atitlanvibes;

import android.os.Bundle;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;


import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Bridge from src/lib/metaEvents.js to Meta's AppEventsLogger.
 *
 * Allowlists live here as well as in JS on purpose: this is the last hop before data
 * leaves the device, so an unlisted event, an unlisted param key, or a value that is not
 * a short opaque token (an email has '@', a name or message has spaces) is dropped no
 * matter what a future JS call site tries to send. Never resolves with an error — a
 * tracking failure must not surface in the UI.
 */
@CapacitorPlugin(name = "MetaEvents")
public class MetaEventsPlugin extends Plugin {

    private static final Set<String> EVENTS = new HashSet<>(Arrays.asList(
            "fb_mobile_complete_registration",
            "fb_mobile_content_view",
            "fb_mobile_add_to_wishlist",
            "login",
            "open_town_chat",
            "send_chat_message",
            "set_current_town",
            "enable_push"
    ));

    private static final Set<String> PARAM_KEYS = new HashSet<>(Arrays.asList(
            "fb_registration_method",
            "fb_content_type",
            "fb_content_id",
            "method",
            "town_id"
    ));

    private static final Pattern TOKEN = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");

    private AppEventsLogger logger;

    @PluginMethod
    public void logEvent(PluginCall call) {
        try {
            String name = call.getString("name");
            if (name == null || !EVENTS.contains(name) || !FacebookSdk.isInitialized()) {
                call.resolve();
                return;
            }

            Bundle bundle = new Bundle();
            JSObject params = call.getObject("params");
            if (params != null) {
                Iterator<String> keys = params.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    Object value = params.opt(key);
                    if (PARAM_KEYS.contains(key) && value != null && TOKEN.matcher(String.valueOf(value)).matches()) {
                        bundle.putString(key, String.valueOf(value));
                    }
                }
            }

            if (logger == null) {
                logger = AppEventsLogger.newLogger(getContext());
            }
            logger.logEvent(name, bundle);
        } catch (Throwable ignored) {
            // fail silent by design
        }
        call.resolve();
    }
}
