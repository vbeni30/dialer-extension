# Dialer Macro Pro

## Install in Chrome or Edge

1. Extract `Dialer-Macro-Pro-v1.5.zip`.
2. Open the browser extensions page.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted `dialer-macro-pro` folder.
6. Open the dialer page and refresh it.

## Included behavior

- Direct Clock In for Jennifer Jones, supervisor ID `3880`
- Finish Call and Answ Mach actions with counters that persist across CRM call/page refreshes in the current tab
- An explicit RESET control for clearing both counters
- F2, F4, F5, and F9 keyboard shortcuts
- Voting and disposition shortcuts
- Luxury black interface with champagne-gold structure and restrained semantic accents

The direct clock-in action expects the CRM to expose the supervisor field with:

```html
<select id="timeclock_supervisor">
```

and a Clock In control in the time-clock UI.
