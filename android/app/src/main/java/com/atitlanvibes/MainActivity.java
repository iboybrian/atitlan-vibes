package com.atitlanvibes;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local (non-npm) plugins must be registered before super.onCreate builds the bridge.
        registerPlugin(MetaEventsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
