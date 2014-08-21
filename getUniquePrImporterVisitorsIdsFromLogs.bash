#!/bin/bash

# Method 1 - sample-submission completion
#grep 'perProbeTypeTableAsyncCallback:async\.parallel:callback:.*' logs/metamorphoo.https.log* | sed -e 's/.*callback://g' | sed -e 's/[^A-Za-z0-9].*$//g' | sort | uniq

# Method 2 (MUCH slower) - entry-point analysis
grep "importSensorData" logs/metamorphoo.log* | sed -e 's/.*UserHash":"//g' | sed -e 's/".*$//g' | sort | uniq