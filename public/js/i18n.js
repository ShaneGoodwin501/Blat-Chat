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
      'menu.profile_photo': 'Profile photo',
      'menu.change_nickname': 'Change nickname',
      'menu.change_password': 'Change password',
      'menu.admin': 'Admin',
      'menu.back_to_chat': 'Back to chat',
      'menu.sign_out': 'Sign out',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.update': 'Update',

      // Composer / chat
      'chat.placeholder': 'Message…',
      'chat.send': 'Send',
      'chat.attach': 'Attach photo',
      'chat.attach_clear': 'Remove',
      'chat.day.today': 'Today',
      'chat.day.yesterday': 'Yesterday',
      'chat.err.disconnected': 'Disconnected. Reconnecting…',
      'chat.err.image_too_large': 'Image too large (max 5MB).',
      'chat.err.image_format': 'Only JPG, PNG, GIF, WebP allowed.',
      'chat.err.upload_failed': 'Upload failed.',
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
      'menu.profile_photo': '\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F',
      'menu.change_nickname': '\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0438\u043A',
      'menu.change_password': '\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C',
      'menu.admin': '\u0410\u0434\u043C\u0438\u043D',
      'menu.back_to_chat': '\u041D\u0430\u0437\u0430\u0434 \u0432 \u0447\u0430\u0442',
      'menu.sign_out': '\u0412\u044B\u0439\u0442\u0438',
      'common.cancel': '\u041E\u0442\u043C\u0435\u043D\u0430',
      'common.save': '\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C',
      'common.update': '\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C',

      'chat.placeholder': '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u2026',
      'chat.send': '\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C',
      'chat.attach': '\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u043E\u0442\u043E',
      'chat.attach_clear': '\u0423\u0431\u0440\u0430\u0442\u044C',
      'chat.day.today': '\u0421\u0435\u0433\u043E\u0434\u043D\u044F',
      'chat.day.yesterday': '\u0412\u0447\u0435\u0440\u0430',
      'chat.err.disconnected': '\u0421\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u043E. \u041F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u2026',
      'chat.err.image_too_large': '\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 (\u043C\u0430\u043A\u0441. 5 \u041C\u0411).',
      'chat.err.image_format': '\u0414\u043E\u043F\u0443\u0441\u043A\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E JPG, PNG, GIF, WebP.',
      'chat.err.upload_failed': '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C.',
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
    // <title> in <head> — set document.title.
    const titleEl = scope.querySelector('title[data-i18n]');
    if (titleEl) document.title = t(titleEl.getAttribute('data-i18n'));
  }

  // Set the browser tab title to a translation key.
  function setPageTitle(key) {
    document.title = t(key);
  }

  // Async helper: refresh language from the server. If the server returns a
  // different value than what was synchronously detected, update everything
  // (current lang, <html lang>, and the DOM via callI18n).
  // Falls back silently to the current value on any error.
  async function loadLang() {
    try {
      const r = await fetch('/api/settings/default-language');
      if (r.ok) {
        const { language } = await r.json();
        if (language && STRINGS[language] && language !== current) {
          setLang(language);
          // Refresh any DOM that was already translated. Note: pages that
          // call loadLang() before the DOM is ready will get a second pass.
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
})();
