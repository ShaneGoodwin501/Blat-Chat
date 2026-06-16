// Client-side i18n. Two languages today: 'en' (default) and 'ru'.
// Translation strings live in `STRINGS`; `t(key)` returns the translated
// string for the current language, falling back to English, then to the
// key itself (so missing translations are obvious in the UI).
//
// Two ways to apply translations:
//   1. Static markup: add `data-i18n="key"` (sets textContent) or
//      `data-i18n-attr="placeholder:key,title:key"` (sets attributes).
//      callI18n() walks the DOM and applies them.
//   2. Dynamic: call `t('key')` directly in JS.
//
// Exposes: window.t, window.setLang, window.getLang, window.callI18n

(function () {
  const STRINGS = {
    en: {
      // App brand — "Blat-Chat" is the project name (GitHub repo); the
      // user-facing room title is "FAMILY-CHAT".
      'app.brand': 'FAMILY-CHAT',
      'app.title': 'FAMILY-CHAT',
      'app.title_login': 'FAMILY-CHAT — Sign in',
      'app.title_admin': 'FAMILY-CHAT — Admin',
      'app.title_forbidden': 'FAMILY-CHAT — Forbidden',

      // Login page
      'login.subtitle': 'Sign in to the family chat',
      'login.username': 'Username',
      'login.password': 'Password',
      'login.submit': 'Sign in',
      'login.submitting': 'Signing in…',
      'login.err.invalid_credentials': 'Invalid username or password.',
      'login.err.too_many_attempts': 'Too many attempts. Try again in a few minutes.',
      'login.err.missing_fields': 'Please enter both username and password.',
      'login.err.generic': 'Sign-in failed. Please try again.',
      'login.err.network': 'Network error. Please try again.',
      'login.eye.show': 'Show password',
      'login.eye.hide': 'Hide password',

      // Header / menu
      'header.signed_in_as': 'Signed in as',
      'header.menu': 'Menu',
      'header.fullscreen': 'Fullscreen',
      'header.fullscreen_enter': 'Enter fullscreen',
      'header.fullscreen_exit': 'Exit fullscreen',
      'pwa.hint.body': 'Want true fullscreen? In Safari, tap Share, then “Add to Home Screen”. Launch the chat from your home screen for an app-like experience.',
      'pwa.hint.dismiss': 'Got it',
      'menu.profile_photo': 'Profile photo',
      'menu.change_nickname': 'Change nickname',
      'menu.change_password': 'Change password',
      'menu.language': 'Language',
      'menu.language_use_default': 'Use default',
      'menu.language_user_help': 'Choose your preferred language for menus and labels. Messages you type can still be in any language.',
      'menu.language_current': 'Current',
      'menu.admin': 'Admin',
      'menu.back_to_chat': 'Back to chat',
      'menu.sign_out': 'Sign out',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.update': 'Update',
      'common.loading': 'Loading…',
      'common.saved': 'Saved',
      'common.error': 'Error',

      // Composer / chat
      'chat.placeholder': 'Message…',
      'chat.send': 'Send',
      'chat.attach': 'Attach photo',
      'chat.attach_clear': 'Remove',
      'chat.emoji': 'Emoji',
      'chat.day.today': 'Today',
      'chat.day.yesterday': 'Yesterday',
      'chat.scroll_to_bottom': 'Jump to latest',
      'chat.typing_one': '{name} is typing…',
      'chat.typing_two': '{a} and {b} are typing…',
      'chat.typing_many': 'Several people are typing…',
      'chat.load_older': 'Load older messages',
      'chat.loading_older': 'Loading…',
      'chat.no_more_history': 'No more messages.',
      'chat.drop_to_attach': 'Drop to attach',
      'chat.notif.permission_request': 'Want a heads-up when new messages arrive? Allow notifications.',
      'chat.notif.enable': 'Enable notifications',
      'chat.notif.disable': 'Disable notifications',
      'chat.notif.granted': 'Notifications enabled.',
      'chat.notif.denied': 'Notifications blocked. Enable them in your browser settings.',
      'chat.notif.new_message': '{name}: {body}',
      'chat.delete': 'Delete',
      'chat.delete_confirm': 'Delete this message?',
      'chat.deleted': 'Message deleted',
      'chat.image_removed': 'Image removed',
      'chat.online': 'Online',
      'chat.offline': 'Offline',
      'chat.copied': 'Copied',
      'chat.voice.record': 'Record voice message',
      'chat.voice.cancel': 'Cancel recording',
      'chat.voice.sending': 'Sending\u2026',
      'chat.voice.too_long': 'Voice messages are limited to 5 minutes.',
      'chat.voice.not_supported': 'Your browser doesn\u2019t support voice messages.',
      'chat.voice.insecure_context': 'Voice messages require a secure (HTTPS) connection. Please use https:// to access the chat.',
      'chat.voice.permission_denied': 'Microphone access denied. Check your browser settings.',
      'chat.voice.err.mic': 'Couldn\u2019t access the microphone. Try again.',
      'chat.voice.err.upload_failed': 'Voice message failed to send. Try again.',
      'chat.err.disconnected': 'Disconnected. Reconnecting\u2026',
      'chat.err.image_too_large': 'Image too large (max 10MB).',
      'chat.err.image_format': 'Couldn\u2019t process that image. Try a JPG or PNG.',
      'chat.err.upload_failed': 'Upload failed. Please try again.',
      'chat.err.network': 'Network error. Check your connection and try again.',
      'chat.uploading': 'Uploading\u2026',
      'chat.err.too_long': 'Message too long.',
      'chat.err.bad_attachment': 'Attachment expired. Re-attach and try again.',
      'chat.err.could_not_send': 'Could not send. Try again.',
      'chat.err.preview_failed': 'Browser can\u2019t preview this image. It will still send if supported.',
      'chat.err.read_failed': 'Could not read that file.',
      'chat.err.avatar_not_loaded': 'Photo uploader not loaded. Refresh and try again.',
      'chat.toast.profile_updated': 'Profile photo updated.',
      'chat.toast.profile_removed': 'Photo removed. Back to colourful initials.',
      'chat.toast.nickname_updated': 'Nickname updated.',
      'chat.toast.nickname_failed': 'Could not change nickname.',
      'chat.toast.password_updated': 'Password updated.',
      'chat.prompt.nickname': 'New nickname:',
      'chat.password.current': 'Current',
      'chat.password.new': 'New',
      'chat.password.confirm': 'Confirm',
      'chat.password.mismatch': 'New passwords do not match.',
      'chat.password.too_short': 'New password must be at least 8 characters.',
      'chat.password.session_expired': 'Your session expired. Sign in again, then try changing your password.',
      'chat.password.wrong_current': "That doesn\u2019t match your current password. Use the eye \u{1F441}\uFE0F to double-check what you typed (the field may have been auto-filled).",

      // Avatar cropper
      'avatar.title': 'Profile photo',
      'avatar.help': 'Drag to position \u00B7 scroll or use the slider to zoom \u00B7 the circle shows what will be saved',
      'avatar.zoom': 'Zoom',
      'avatar.placeholder': 'Pick a photo to start',
      'avatar.choose': 'Choose photo\u2026',
      'avatar.save': 'Save',
      'avatar.remove': 'Remove photo',
      'avatar.close': 'Close',
      'avatar.uploading': 'Uploading\u2026',
      'avatar.remove_confirm': "Remove your profile photo? You'll go back to the colourful initials.",
      'avatar.could_not_remove': 'Could not remove photo. Try again.',
      'avatar.too_large': 'File too large (max 8MB). Pick a smaller image.',
      'avatar.cant_decode': "Your browser couldn\u2019t decode that image. Try a regular JPG or PNG (a screenshot works).",
      'avatar.cant_read': 'Couldn\u2019t read the file. Try a different one.',
      'avatar.heic_hint': "That looks like an iPhone HEIC/HEIF photo ({brand}). Most browsers can't decode it directly. In your phone's camera settings, switch to \u201cMost Compatible\u201D (JPG), then re-upload.",
      'avatar.crop_failed': 'Crop failed',
      'avatar.server_too_large': 'Image too large (server limit).',
      'avatar.server_bad_mime': 'Server rejected the image format.',

      // Admin page
      'admin.title': 'Admin',
      'admin.add_user': 'Add user',
      'admin.users': 'Users',
      'admin.col.user': 'User',
      'admin.col.role': 'Role',
      'admin.col.active': 'Active',
      'admin.col.created': 'Created',
      'admin.col.actions': 'Actions',
      'admin.role.admin': 'admin',
      'admin.role.user': 'user',
      'admin.pill.active': 'active',
      'admin.pill.disabled': 'disabled',
      'admin.users_count_one': '{n} user',
      'admin.users_count_other': '{n} users',
      'admin.no_users': 'No users yet.',
      'admin.loading': 'Loading\u2026',
      'admin.act.rename': 'Rename',
      'admin.act.reset_pw': 'Reset PW',
      'admin.act.promote': 'Promote',
      'admin.act.demote': 'Demote',
      'admin.act.disable': 'Disable',
      'admin.act.enable': 'Enable',
      'admin.act.delete': 'Delete',
      'admin.modal.delete.title': 'Delete user?',
      'admin.modal.delete.body': 'This permanently removes the user and all their messages. Cannot be undone.',
      'admin.modal.delete.confirm': 'Type <strong>DELETE</strong> to confirm',
      'admin.modal.delete.primary': 'Delete',
      'admin.modal.delete.err_mismatch': 'Type DELETE to confirm.',
      'admin.modal.delete.err_self': 'You cannot delete your own account here.',
      'admin.modal.delete.err_last_admin': 'Cannot delete the only remaining admin.',
      'admin.modal.delete.err_generic': 'Delete failed.',
      'admin.modal.rename.title': 'Rename user',
      'admin.modal.rename.label': 'Display name',
      'admin.modal.reset.title': 'Reset password',
      'admin.modal.reset.label': 'New password (min 8)',
      'admin.modal.reset.primary': 'Set password',
      'admin.modal.reset.err_short': 'Min 8 characters.',
      'admin.modal.demote.title': 'Demote to user?',
      'admin.modal.demote.body': "They'll keep their account but lose admin access (and the Admin link in the header).",
      'admin.modal.demote.primary': 'Demote',
      'admin.modal.disable.title': 'Disable user?',
      'admin.modal.disable.body': "They'll be signed out and unable to log in. Their messages stay. You can re-enable later.",
      'admin.modal.disable.primary': 'Disable',
      'admin.toast.renamed': 'Renamed.',
      'admin.toast.password_reset': 'Password reset.',
      'admin.toast.demoted': 'Demoted.',
      'admin.toast.promoted': 'Promoted to admin.',
      'admin.toast.disabled': 'Disabled.',
      'admin.toast.enabled': 'Enabled.',
      'admin.toast.deleted': 'User deleted.',
      'admin.toast.update_failed': 'Update failed: {err}',
      'admin.toast.create_failed': 'Failed: {err}',
      'admin.toast.user_created': "User '{name}' created.",
      'admin.err.bad_username': 'Username must be 3-32 letters/digits/_.-',
      'admin.err.password_too_short': 'Password must be at least 8 characters.',
      'admin.err.username_taken': 'That username is already in use.',
      'admin.err.load_failed': 'Failed to load: {err}',

      // Admin: danger zone (bulk message admin)
      'admin.danger.title': 'Danger zone',
      'admin.danger.help': 'Irreversible bulk operations on chat history. Make sure you have a recent backup.',
      'admin.danger.keep5d.label': 'Delete everything except the last 5 days',
      'admin.danger.keep5d.help': 'Removes every message older than 5 days. Newer messages (and any attached photos) stay.',
      'admin.danger.keep5d.btn': 'Delete older than 5 days',
      'admin.danger.all.label': 'Delete all messages',
      'admin.danger.all.help': 'Removes every message in the chat, plus all attached photos. Users and accounts are not affected.',
      'admin.danger.all.btn': 'Delete all messages',
      'admin.danger.modal.keep5d.title': 'Delete everything older than 5 days?',
      'admin.danger.modal.keep5d.body': 'This will permanently delete every message older than 5 days. Newer messages and their photos will remain. This cannot be undone.',
      'admin.danger.modal.keep5d.confirm': 'Type <strong>DELETE MESSAGES</strong> to confirm',
      'admin.danger.modal.keep5d.primary': 'Delete old messages',
      'admin.danger.modal.all.title': 'Delete every message?',
      'admin.danger.modal.all.body': 'This will permanently delete every message in the chat, and all attached photos. User accounts are not affected. This cannot be undone.',
      'admin.danger.modal.all.confirm': 'Type <strong>DELETE MESSAGES</strong> to confirm',
      'admin.danger.modal.all.primary': 'Delete all messages',
      'admin.danger.modal.err_mismatch': 'Type DELETE MESSAGES exactly to confirm.',
      'admin.danger.modal.err_bad_days': 'Invalid retention window.',
      'admin.danger.modal.err_generic': 'Delete failed: {err}',
      'admin.danger.toast.keep5d_done': 'Removed {n} old message(s), kept {kept}. {att} photo file(s) cleaned up.',
      'admin.danger.toast.all_done': 'Removed {n} message(s). {att} photo file(s) cleaned up.',

      // Settings
      'settings.title': 'Settings',
      'settings.language': 'Language',
      'settings.language_help': 'This sets the language used in menus and labels for all users. Messages you type can still be in any language.',
      'settings.lang.en': 'English',
      'settings.lang.ru': '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
      'settings.saved': 'Language setting saved.',

      // 403
      'forbidden.title': '403',
      'forbidden.body': "You don't have access to that page.",
      'forbidden.back': 'Back to chat',

      // Misc
      'misc.server_err': 'Server: {err}',
      'misc.server_status': 'Server returned {status}.',
      'misc.failed': 'Something went wrong.',

      'common.online_indicator': 'Online',
    },

    ru: {
      'app.brand': '\u0421\u0415\u041C\u0415\u0419\u041D\u042B\u0419 \u0427\u0410\u0422',
      'app.title': '\u0421\u0415\u041C\u0415\u0419\u041D\u042B\u0419 \u0427\u0410\u0422',
      'app.title_login': '\u0421\u0415\u041C\u0415\u0419\u041D\u042B\u0419 \u0427\u0410\u0422 \u2014 \u0412\u0445\u043E\u0434',
      'app.title_admin': '\u0421\u0415\u041C\u0415\u0419\u041D\u042B\u0419 \u0427\u0410\u0422 \u2014 \u0410\u0434\u043C\u0438\u043D',
      'app.title_forbidden': '\u0421\u0415\u041C\u0415\u0419\u041D\u042B\u0419 \u0427\u0410\u0422 \u2014 \u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D',

      'login.subtitle': '\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0432 \u0441\u0435\u043C\u0435\u0439\u043D\u044B\u0439 \u0447\u0430\u0442',
      'login.username': '\u041B\u043E\u0433\u0438\u043D',
      'login.password': '\u041F\u0430\u0440\u043E\u043B\u044C',
      'login.submit': '\u0412\u043E\u0439\u0442\u0438',
      'login.submitting': '\u0412\u0445\u043E\u0434\u2026',
      'login.err.invalid_credentials': '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C.',
      'login.err.too_many_attempts': '\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043F\u044B\u0442\u043E\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0447\u0435\u0440\u0435\u0437 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043C\u0438\u043D\u0443\u0442.',
      'login.err.missing_fields': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438 \u043B\u043E\u0433\u0438\u043D, \u0438 \u043F\u0430\u0440\u043E\u043B\u044C.',
      'login.err.generic': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0439\u0442\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'login.err.network': '\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'login.eye.show': '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',
      'login.eye.hide': '\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',

      'header.signed_in_as': '\u0412\u043E\u0448\u043B\u0438 \u043A\u0430\u043A',
      'header.menu': '\u041C\u0435\u043D\u044E',
      'header.fullscreen': '\u041D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D',
      'header.fullscreen_enter': '\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D',
      'header.fullscreen_exit': '\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430',
      'pwa.hint.body': '\u0425\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u043B\u043D\u044B\u0439 \u044D\u043A\u0440\u0430\u043D? \u0412 Safari \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u00AB\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F\u00BB, \u0437\u0430\u0442\u0435\u043C \u00AB\u041D\u0430 \u044D\u043A\u0440\u0430\u043D \u0414\u043E\u043C\u043E\u0439\u00BB. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0447\u0430\u0442 \u0441 \u0434\u043E\u043C\u0430\u0448\u043D\u0435\u0433\u043E \u044D\u043A\u0440\u0430\u043D\u0430, \u043A\u0430\u043A \u043E\u0431\u044B\u0447\u043D\u043E\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435.',
      'pwa.hint.dismiss': '\u041F\u043E\u043D\u044F\u0442\u043D\u043E',
      'menu.profile_photo': '\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F',
      'menu.change_nickname': '\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0438\u043A',
      'menu.change_password': '\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',
      'menu.language': '\u042F\u0437\u044B\u043A',
      'menu.language_use_default': '\u041F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E',
      'menu.language_user_help': '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043F\u043E\u0447\u0438\u0442\u0430\u0435\u043C\u044B\u0439 \u044F\u0437\u044B\u043A \u0434\u043B\u044F \u043C\u0435\u043D\u044E \u0438 \u043D\u0430\u0434\u043F\u0438\u0441\u0435\u0439. \u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043C\u043E\u0436\u043D\u043E \u043F\u0438\u0441\u0430\u0442\u044C \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u044F\u0437\u044B\u043A\u0435.',
      'menu.language_current': '\u0422\u0435\u043A\u0443\u0449\u0438\u0439',
      'menu.admin': '\u0410\u0434\u043C\u0438\u043D',
      'menu.back_to_chat': '\u041D\u0430\u0437\u0430\u0434 \u0432 \u0447\u0430\u0442',
      'menu.sign_out': '\u0412\u044B\u0439\u0442\u0438',
      'common.cancel': '\u041E\u0442\u043C\u0435\u043D\u0430',
      'common.save': '\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C',
      'common.update': '\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C',
      'common.loading': '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026',
      'common.saved': '\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E',
      'common.error': '\u041E\u0448\u0438\u0431\u043A\u0430',

      'chat.placeholder': '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u2026',
      'chat.send': '\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C',
      'chat.attach': '\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u043E\u0442\u043E',
      'chat.attach_clear': '\u0423\u0431\u0440\u0430\u0442\u044C',
      'chat.emoji': '\u042D\u043C\u043E\u0434\u0437\u0438',
      'chat.day.today': '\u0421\u0435\u0433\u043E\u0434\u043D\u044F',
      'chat.day.yesterday': '\u0412\u0447\u0435\u0440\u0430',
      'chat.scroll_to_bottom': '\u041A \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u043C\u0443',
      'chat.typing_one': '{name} \u043F\u0435\u0447\u0430\u0442\u0430\u0435\u0442\u2026',
      'chat.typing_two': '{a} \u0438 {b} \u043F\u0435\u0447\u0430\u0442\u0430\u044E\u0442\u2026',
      'chat.typing_many': '\u041D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u043F\u0435\u0447\u0430\u0442\u0430\u044E\u0442\u2026',
      'chat.load_older': '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0442\u0430\u0440\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F',
      'chat.loading_older': '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026',
      'chat.no_more_history': '\u0411\u043E\u043B\u044C\u0448\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u043D\u0435\u0442.',
      'chat.drop_to_attach': '\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0444\u0430\u0439\u043B \u0441\u044E\u0434\u0430',
      'chat.notif.permission_request': '\u0425\u043E\u0442\u0438\u0442\u0435 \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u043D\u043E\u0432\u044B\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F\u0445? \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0438\u0445.',
      'chat.notif.enable': '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F',
      'chat.notif.disable': '\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F',
      'chat.notif.granted': '\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B.',
      'chat.notif.denied': '\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0438\u0445 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430.',
      'chat.notif.new_message': '{name}: {body}',
      'chat.delete': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C',
      'chat.delete_confirm': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435?',
      'chat.deleted': '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E',
      'chat.image_removed': '\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E',
      'chat.online': '\u0412 \u0441\u0435\u0442\u0438',
      'chat.offline': '\u041D\u0435 \u0432 \u0441\u0435\u0442\u0438',
      'chat.copy': '\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C',
      'chat.copied': '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E',
      'chat.voice.record': '\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435',
      'chat.voice.cancel': '\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C',
      'chat.voice.sending': '\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430\u2026',
      'chat.voice.too_long': '\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u2014 \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 5 \u043C\u0438\u043D\u0443\u0442.',
      'chat.voice.not_supported': '\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F.',
      'chat.voice.insecure_context': '\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u0437\u0430\u0449\u0438\u0449\u0435\u043D\u043D\u043E\u0433\u043E \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F (HTTPS). \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 https://.',
      'chat.voice.permission_denied': '\u0414\u043E\u0441\u0442\u0443\u043F \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443 \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430.',
      'chat.voice.err.mic': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0443. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'chat.voice.err.upload_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0435. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'chat.err.disconnected': '\u0421\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u043E. \u041F\u0435\u0440\u0435\u043F\u043E\u0434\u041A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u2026',
      'chat.err.image_too_large': '\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 (\u043C\u0430\u043A\u0441. 10 \u041C\u0411).',
      'chat.err.image_format': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0444\u043E\u0442\u043E. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 JPG \u0438\u043B\u0438 PNG.',
      'chat.err.upload_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'chat.err.network': '\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.',
      'chat.uploading': '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026',
      'chat.err.too_long': '\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435.',
      'chat.err.bad_attachment': '\u0412\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0443\u0441\u0442\u0430\u0440\u0435\u043B\u043E. \u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E.',
      'chat.err.could_not_send': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'chat.err.preview_failed': '\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0440\u0435\u0432\u044C\u044E. \u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u0430.',
      'chat.err.read_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B.',
      'chat.err.avatar_not_loaded': '\u0417\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043A \u0444\u043E\u0442\u043E \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.',
      'chat.toast.profile_updated': '\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E.',
      'chat.toast.profile_removed': '\u0424\u043E\u0442\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u043E. \u0412\u0435\u0440\u043D\u0443\u043B\u0438\u0441\u044C \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u044B.',
      'chat.toast.nickname_updated': '\u041D\u0438\u043A \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.',
      'chat.toast.nickname_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0438\u043A.',
      'chat.toast.password_updated': '\u041F\u0430\u0440\u043E\u043B\u044C \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D.',
      'chat.prompt.nickname': '\u041D\u043E\u0432\u044B\u0439 \u043D\u0438\u043A:',
      'chat.password.current': '\u0422\u0435\u043A\u0443\u0449\u0438\u0439',
      'chat.password.new': '\u041D\u043E\u0432\u044B\u0439',
      'chat.password.confirm': '\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435',
      'chat.password.mismatch': '\u041F\u0430\u0440\u043E\u043B\u0438 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442.',
      'chat.password.too_short': '\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u043A\u043E\u0440\u043E\u0447\u0435 8 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.',
      'chat.password.session_expired': '\u0421\u0435\u0441\u0441\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u0430. \u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.',
      'chat.password.wrong_current': "\u042D\u0442\u043E \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0432\u0430\u0448\u0438\u043C \u0442\u0435\u043A\u0443\u0449\u0438\u043C \u043F\u0430\u0440\u043E\u043B\u0435\u043C. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0433\u043B\u0430\u0437 \u{1F441}\uFE0F, \u0447\u0442\u043E\u0431\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C (\u043F\u043E\u043B\u0435 \u043C\u043E\u0433\u043B\u043E \u0430\u0432\u0442\u043E\u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C\u0441\u044F).",

      'avatar.title': '\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F',
      'avatar.help': '\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043C\u0435\u0441\u0442\u0438\u0442\u044C \u2022 \u043F\u0440\u043E\u043A\u0440\u0443\u0442\u0438\u0442\u0435 \u043A\u043E\u043B\u0451\u0441\u0438\u043A\u043E\u043C \u0438\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u043B\u0437\u0443\u043D\u043E\u041A \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0430 \u2022 \u043A\u0440\u0443\u0433 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442, \u0447\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E',
      'avatar.zoom': '\u041C\u0430\u0441\u0448\u0442\u0430\u0431',
      'avatar.placeholder': '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u043D\u0430\u0447\u0430\u043B\u0430',
      'avatar.choose': '\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0444\u043E\u0442\u043E\u2026',
      'avatar.save': '\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C',
      'avatar.remove': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u043E\u0442\u043E',
      'avatar.close': '\u0417\u0430\u043A\u0440\u044B\u0442\u044C',
      'avatar.uploading': '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026',
      'avatar.remove_confirm': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F? \u0412\u0435\u0440\u043D\u0443\u0442\u0441\u044F \u0446\u0432\u0435\u0442\u043D\u044B\u0435 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u044B.',
      'avatar.could_not_remove': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.',
      'avatar.too_large': '\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 (\u043C\u0430\u043A\u0441. 8 \u041C\u0411). \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0435\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435.',
      'avatar.cant_decode': '\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u0441\u043C\u043E\u0433 \u0440\u0430\u0441\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u044D\u0442\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u044B\u0447\u043D\u044B\u0439 JPG \u0438\u043B\u0438 PNG (\u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442 \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442).',
      'avatar.cant_read': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0439.',
      'avatar.heic_hint': "\u042D\u0442\u043E \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u0444\u043E\u0442\u043E iPhone \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 HEIC/HEIF ({brand}). \u0411\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u0432 \u043D\u0435 \u0443\u043C\u0435\u044E\u0442 \u0435\u0433\u043E \u0434\u0435\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u0442\u044C. \u0412 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043A\u0430\u043C\u0435\u0440\u044B \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u00AB\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u00BB (JPG), \u0437\u0430\u0442\u0435\u043C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
      'avatar.crop_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0435\u0437\u0430\u0442\u044C',
      'avatar.server_too_large': '\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 (\u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u0430).',
      'avatar.server_bad_mime': '\u0421\u0435\u0440\u0432\u0435\u0440 \u043E\u0442\u043A\u043B\u043E\u043D\u0438\u043B \u0444\u043E\u0440\u043C\u0430\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F.',

      'admin.title': '\u0410\u0434\u043C\u0438\u043D',
      'admin.add_user': '\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F',
      'admin.users': '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438',
      'admin.col.user': '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C',
      'admin.col.role': '\u0420\u043E\u043B\u044C',
      'admin.col.active': '\u0410\u043A\u0442\u0438\u0432\u0435\u043D',
      'admin.col.created': '\u0421\u043E\u0437\u0434\u0430\u043D',
      'admin.col.actions': '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F',
      'admin.role.admin': '\u0430\u0434\u043C\u0438\u043D',
      'admin.role.user': '\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C',
      'admin.pill.active': '\u0430\u043A\u0442\u0438\u0432\u0435\u043D',
      'admin.pill.disabled': '\u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D',
      'admin.users_count_one': '{n} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C',
      'admin.users_count_other': '{n} \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439',
      'admin.no_users': '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.',
      'admin.loading': '\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026',
      'admin.act.rename': '\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C',
      'admin.act.reset_pw': '\u0421\u0431\u0440\u043E\u0441 \u043F\u0430\u0440\u043E\u043B\u044F',
      'admin.act.promote': '\u041F\u043E\u0432\u044B\u0441\u0438\u0442\u044C',
      'admin.act.demote': '\u041F\u043E\u043D\u0438\u0437\u0438\u0442\u044C',
      'admin.act.disable': '\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C',
      'admin.act.enable': '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C',
      'admin.act.delete': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C',
      'admin.modal.delete.title': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?',
      'admin.modal.delete.body': '\u042D\u0442\u043E \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0443\u0434\u0430\u043B\u0438\u0442 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u0432\u0441\u0435 \u0435\u0433\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.',
      'admin.modal.delete.confirm': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 <strong>DELETE</strong> \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F',
      'admin.modal.delete.primary': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C',
      'admin.modal.delete.err_mismatch': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 DELETE \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.',
      'admin.modal.delete.err_self': '\u0412\u044B \u043D\u0435 \u043C\u043E\u0436\u0435\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0432\u043E\u0439 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442.',
      'admin.modal.delete.err_last_admin': '\u041D\u0435\u043B\u044C\u0437\u044F \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0435\u0434\u0438\u043D\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E \u0430\u0434\u043C\u0438\u043D\u0430.',
      'admin.modal.delete.err_generic': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C.',
      'admin.modal.rename.title': '\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u0442\u044C',
      'admin.modal.rename.label': '\u041E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0435\u043C\u043E\u0435 \u0438\u043C\u044F',
      'admin.modal.reset.title': '\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',
      'admin.modal.reset.label': '\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C (\u043C\u0438\u043D. 8)',
      'admin.modal.reset.primary': '\u0417\u0430\u0434\u0430\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',
      'admin.modal.reset.err_short': '\u041C\u0438\u043D\u0438\u043C\u0443\u043C 8 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.',
      'admin.modal.demote.title': '\u041F\u043E\u043D\u0438\u0437\u0438\u0442\u044C \u0434\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?',
      'admin.modal.demote.body': '\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F, \u043D\u043E \u043F\u0440\u0430\u0432\u0430 \u0430\u0434\u043C\u0438\u043D\u0430 \u0431\u0443\u0434\u0443\u0442 \u0443\u0431\u0440\u0430\u043D\u044B (\u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0443 \u00AB\u0410\u0434\u043C\u0438\u043D\u00BB \u0432 \u0448\u0430\u043F\u043A\u0435).',
      'admin.modal.demote.primary': '\u041F\u043E\u043D\u0438\u0437\u0438\u0442\u044C',
      'admin.modal.disable.title': '\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?',
      'admin.modal.disable.body': '\u041E\u043D \u0431\u0443\u0434\u0435\u0442 \u0432\u044B\u0439\u0434\u0435\u043D \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u0438 \u043D\u0435 \u0441\u043C\u043E\u0436\u0435\u0442 \u0432\u043E\u0439\u0442\u0438. \u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F. \u041C\u043E\u0436\u043D\u043E \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043F\u043E\u0437\u0436\u0435.',
      'admin.modal.disable.primary': '\u041E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C',
      'admin.toast.renamed': '\u041F\u0435\u0440\u0435\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u043E.',
      'admin.toast.password_reset': '\u041F\u0430\u0440\u043E\u043B\u044C \u0441\u0431\u0440\u043E\u0448\u0435\u043D.',
      'admin.toast.demoted': '\u041F\u043E\u043D\u0438\u0436\u0435\u043D.',
      'admin.toast.promoted': '\u041F\u043E\u0432\u044B\u0448\u0435\u043D \u0434\u043E \u0430\u0434\u043C\u0438\u043D\u0430.',
      'admin.toast.disabled': '\u041E\u0442\u043A\u043B\u044E\u0447\u0451\u043D.',
      'admin.toast.enabled': '\u0412\u043A\u043B\u044E\u0447\u0451\u043D.',
      'admin.toast.deleted': '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0443\u0434\u0430\u043B\u0451\u043D.',
      'admin.toast.update_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C: {err}',
      'admin.toast.create_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C: {err}',
      'admin.toast.user_created': "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u00AB{name}\u00BB \u0441\u043E\u0437\u0434\u0430\u043D.",
      'admin.err.bad_username': '\u041B\u043E\u0433\u0438\u043D 3-32 \u0441\u0438\u043C\u0432\u043E\u043B\u0430: \u0431\u0443\u043A\u0432\u044B, \u0446\u0438\u0444\u0440\u044B, _ . -',
      'admin.err.password_too_short': '\u041F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043D\u0435 \u043A\u043E\u0440\u043E\u0447\u0435 8 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432.',
      'admin.err.username_taken': '\u042D\u0442\u043E\u0442 \u043B\u043E\u0433\u0438\u043D \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442.',
      'admin.err.load_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C: {err}',

      // Admin: danger zone (bulk message admin)
      'admin.danger.title': '\u041E\u043F\u0430\u0441\u043D\u0430\u044F \u0437\u043E\u043D\u0430',
      'admin.danger.help': '\u041D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u044B\u0435 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 \u043D\u0430\u0434 \u0438\u0441\u0442\u043E\u0440\u0438\u0435\u0439 \u0447\u0430\u0442\u0430. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0443 \u0432\u0430\u0441 \u0435\u0441\u0442\u044C \u0441\u0432\u0435\u0436\u0430\u044F \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F.',
      'admin.danger.keep5d.label': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0451, \u043A\u0440\u043E\u043C\u0435 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0445 5 \u0434\u043D\u0435\u0439',
      'admin.danger.keep5d.help': '\u0423\u0434\u0430\u043B\u044F\u0435\u0442 \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0440\u0448\u0435 5 \u0434\u043D\u0435\u0439. \u0411\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F (\u0438 \u0438\u0445 \u0444\u043E\u0442\u043E) \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F.',
      'admin.danger.keep5d.btn': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0430\u0440\u0448\u0435 5 \u0434\u043D\u0435\u0439',
      'admin.danger.all.label': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F',
      'admin.danger.all.help': '\u0423\u0434\u0430\u043B\u044F\u0435\u0442 \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0432 \u0447\u0430\u0442\u0435 \u0438 \u0432\u0441\u0435 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0435 \u0444\u043E\u0442\u043E. \u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043D\u0435 \u0437\u0430\u0442\u0440\u0430\u0433\u0438\u0432\u0430\u044E\u0442\u0441\u044F.',
      'admin.danger.all.btn': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F',
      'admin.danger.modal.keep5d.title': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0451 \u0441\u0442\u0430\u0440\u0448\u0435 5 \u0434\u043D\u0435\u0439?',
      'admin.danger.modal.keep5d.body': '\u042D\u0442\u043E \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0443\u0434\u0430\u043B\u0438\u0442 \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441\u0442\u0430\u0440\u0448\u0435 5 \u0434\u043D\u0435\u0439. \u0411\u043E\u043B\u0435\u0435 \u043D\u043E\u0432\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438 \u0438\u0445 \u0444\u043E\u0442\u043E \u043E\u0441\u0442\u0430\u043D\u0443\u0442\u0441\u044F. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.',
      'admin.danger.modal.keep5d.confirm': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 <strong>DELETE MESSAGES</strong> \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F',
      'admin.danger.modal.keep5d.primary': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0442\u0430\u0440\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F',
      'admin.danger.modal.all.title': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F?',
      'admin.danger.modal.all.body': '\u042D\u0442\u043E \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0443\u0434\u0430\u043B\u0438\u0442 \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0432 \u0447\u0430\u0442\u0435 \u0438 \u0432\u0441\u0435 \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D\u043D\u044B\u0435 \u0444\u043E\u0442\u043E. \u0410\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439 \u043D\u0435 \u0437\u0430\u0442\u0440\u0430\u0433\u0438\u0432\u0430\u044E\u0442\u0441\u044F. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F.',
      'admin.danger.modal.all.confirm': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 <strong>DELETE MESSAGES</strong> \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F',
      'admin.danger.modal.all.primary': '\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F',
      'admin.danger.modal.err_mismatch': '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0440\u043E\u0432\u043D\u043E DELETE MESSAGES \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.',
      'admin.danger.modal.err_bad_days': '\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u043D\u0442\u0435\u0440\u0432\u0430\u043B \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F.',
      'admin.danger.modal.err_generic': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C: {err}',
      'admin.danger.toast.keep5d_done': '\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0441\u0442\u0430\u0440\u044B\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: {n}, \u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E: {kept}. \u0424\u0430\u0439\u043B\u043E\u0432 \u0444\u043E\u0442\u043E \u043E\u0447\u0438\u0449\u0435\u043D\u043E: {att}.',
      'admin.danger.toast.all_done': '\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: {n}. \u0424\u0430\u0439\u043B\u043E\u0432 \u0444\u043E\u0442\u043E \u043E\u0447\u0438\u0449\u0435\u043D\u043E: {att}.',

      'settings.title': '\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438',
      'settings.language': '\u042F\u0437\u044B\u043A',
      'settings.language_help': '\u042F\u0437\u044B\u043A \u043C\u0435\u043D\u044E \u0438 \u043D\u0430\u0434\u043F\u0438\u0441\u0435\u0439 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439. \u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043C\u043E\u0436\u043D\u043E \u043F\u0438\u0441\u0430\u0442\u044C \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u044F\u0437\u044B\u043A\u0435.',
      'settings.lang.en': 'English',
      'settings.lang.ru': '\u0420\u0443\u0441\u0441\u043A\u0438\u0439',
      'settings.saved': '\u042F\u0437\u044B\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D.',

      'forbidden.title': '403',
      'forbidden.body': '\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435.',
      'forbidden.back': '\u041D\u0430\u0437\u0430\u0434 \u0432 \u0447\u0430\u0442',

      'misc.server_err': '\u0421\u0435\u0440\u0432\u0435\u0440: {err}',
      'misc.server_status': '\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043D\u0443\u043B {status}.',
      'misc.failed': '\u0427\u0442\u043E-\u0442\u043E \u043F\u043E\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A.',

      'common.online_indicator': '\u0412 \u0441\u0435\u0442\u0438',
    },
  };

  // ---- interpolation ----
  function fill(template, vars) {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }

  // Persistent local backup so the chat page doesn't briefly flash English
  // if the server fetch is slow.
  const LANG_STORAGE_KEY = 'blatchat.lang';
  function readStoredLang() {
    try { return localStorage.getItem(LANG_STORAGE_KEY); } catch { return null; }
  }
  function writeStoredLang(lang) {
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
  }

  // Initial language: prefer the <meta name="blatchat-lang"> tag the server
  // injects, then localStorage, then 'en'. This avoids a flash of English on
  // page load while the async /api/settings call is in flight.
  function readMetaLang() {
    const m = document.querySelector('meta[name="blatchat-lang"]');
    if (m && m.content && STRINGS[m.content]) return m.content;
    return null;
  }
  let current = readMetaLang() || readStoredLang() || 'en';

  function getLang() { return current; }

  function t(key, vars) {
    const table = STRINGS[current] || STRINGS.en;
    let s = table[key];
    if (s === undefined) s = STRINGS.en[key];
    if (s === undefined) s = key; // last-resort: surface the key
    return fill(s, vars);
  }

  function setLang(lang) {
    if (STRINGS[lang]) current = lang;
    else current = 'en';
    try { document.documentElement.lang = current; } catch {}
    writeStoredLang(current);
  }

  // Walk the DOM and apply data-i18n / data-i18n-attr.
  function callI18n(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr'); // e.g. "placeholder:chat.placeholder,title:chat.send"
      spec.split(',').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    // data-drag-text — translated CSS pseudo-content for the drag overlay.
    scope.querySelectorAll('[data-drag-text]').forEach((el) => {
      const key = el.getAttribute('data-drag-text-i18n') || 'chat.drop_to_attach';
      el.setAttribute('data-drag-text', t(key));
    });
    // <title> in <head> — set document.title.
    const titleEl = scope.querySelector('title[data-i18n]');
    if (titleEl) document.title = t(titleEl.getAttribute('data-i18n'));
  }

  // Set the browser tab title to a translation key.
  function setPageTitle(key) {
    document.title = t(key);
  }

  // Async helper: refresh language from the server. The server is the
  // source of truth for the default language, so we always apply what it
  // returns — even if it matches the current value (re-applying translations
  // is cheap and guarantees the DOM is in sync with the DB).
  // Falls back silently to the current value on any error.
  async function loadLang() {
    try {
      const r = await fetch('/api/settings/default-language');
      if (r.ok) {
        const { language } = await r.json();
        if (language && STRINGS[language]) {
          if (language !== current) setLang(language);
          // Always re-apply so any DOM added between i18n.js load and
          // this call (e.g. login.js rebuilt the form) gets translated.
          if (typeof callI18n === 'function') callI18n();
        }
      }
    } catch {}
    return current;
  }

  window.t = t;
  window.setLang = setLang;
  window.getLang = getLang;
  window.callI18n = callI18n;
  window.setPageTitle = setPageTitle;
  window.loadLang = loadLang;

  // Apply translations to the static DOM right now, synchronously.
  // i18n.js is loaded at the end of <body>, so all the static elements
  // (header, menu, composer, etc.) are in the DOM by the time we run.
  // This avoids the brief English flash while the async /api/settings
  // call is in flight. Pages that mount additional UI later can call
  // callI18n(root) again.
  try { callI18n(); } catch (e) { /* document may be partially built in edge cases */ }
  // Set <html lang> for screen readers / CSS :lang() selectors.
  try { document.documentElement.lang = current; } catch {}
})();
