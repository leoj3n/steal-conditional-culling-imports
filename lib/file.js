import '~/lib/file-a#?always-false';
import '~/lib/file-b#?always-false';
import conditionalFile from '~/lib/file-#{~/lib/a-or-b}';
export default conditionalFile;
