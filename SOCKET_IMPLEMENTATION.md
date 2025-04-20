# Socket.IO Standardization Guide

## Overview

This document explains the standardized Socket.IO notification implementation that has been introduced to the project. The goal is to centralize Socket.IO functionality and reduce code duplication.

## New Shared Functions

The following shared functions are now available in `src/lib/websocket.js`:

### 1. `getSocketServerUrl()`
- Returns the configured Socket.IO server URL with fallbacks
- Prioritizes environment variables, then Docker container names, then localhost

### 2. `getSocketClientUrl()`
- Returns the Socket.IO client URL for browser connections
- Used in the Socket.IO context provider

### 3. `logSocketError(error, context)`
- Logs detailed error information for Socket.IO connections
- Includes name, message, stack trace, and provided context

### 4. `sendSocketNotification(event, data, timeoutMs = 3000)`
- **NEW**: Standardized implementation for sending Socket.IO notifications
- Features:
  - Uses the shared `getSocketServerUrl()` function
  - Implements timeout handling using AbortController
  - Consistent error handling and logging
  - Default timeout of 3 seconds (configurable)

## How to Update Existing API Routes

Many API routes currently have their own implementation of `sendSocketNotification`. To use the shared implementation, follow these steps:

### Step 1: Update Imports

Replace:
```javascript
import { getSocketServerUrl, logSocketError } from '@/lib/websocket';
```

With:
```javascript
import { sendSocketNotification } from '@/lib/websocket';
```

### Step 2: Remove Local Implementation

Remove the local `sendSocketNotification` function from your file.

### Step 3: Use the Shared Function

Use the shared function directly in your API routes, for example:

```javascript
await sendSocketNotification('slot:update', {
  ...updatedData,
  updateType: 'some-update-type'
});
```

## Example Implementation

The `driver-start-note` API route has been updated to use the shared implementation:

```javascript
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendSocketNotification } from '@/lib/websocket';

export async function PUT(request, { params }) {
  // ... existing code
  
  try {
    await sendSocketNotification('slot:update', {
      ...updatedSlot,
      date: date,
      updateType: 'driver-start-note'
    });
    console.log('Driver start note güncelleme bildirimi başarıyla gönderildi');
  } catch (wsError) {
    console.error('Driver start note güncelleme bildirimi gönderilirken hata:', wsError);
    console.log('Socket.IO bildirimi başarısız oldu, ancak API işlemine devam ediliyor');
  }
  
  // ... rest of the function
}
```

## Files That Need Updates

Based on codebase analysis, the following files have custom implementations that should be updated:

1. `src/app/api/transport-notes/route.js`
2. `src/app/api/planning/transports/assign/route.js`
3. `src/app/api/planning/transports/[id]/status/route.js`
4. `src/app/api/transports/[id]/scrcpu-driver-assignment/route.js`
5. `src/app/api/transports/[id]/scrcpu/route.js`
6. `src/app/api/transports/[id]/scrcpu-requirement/route.js`
7. `src/app/api/planning/transports/[id]/status/update/route.js`
8. `src/app/api/planning/transports/reorder/route.js`
9. `src/app/api/planning/slots/reorder/route.js`
10. `src/app/api/planning/transports/[id]/trailer/route.js`

## Benefits

- **Consistency**: All API routes use the same notification implementation
- **Maintainability**: Changes to Socket.IO handling can be made in one place
- **Error Handling**: Consistent error handling and logging
- **Code Reduction**: Removes duplicate code across multiple files 