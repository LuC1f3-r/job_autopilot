// Lightweight relative-time formatting ("2 hours ago", "Yesterday", "4 days
// ago") — no date library in this project yet. Originally lived inline in
// JobsTable.tsx (Feature 10); extracted here in Feature 12 since the Job
// Details page's Date Found info card needs the exact same formatting.
export function formatRelativeDate(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}
