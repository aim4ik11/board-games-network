type UserIdentityProps = {
  userId?: string;
  displayName: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
  withProfileLink?: boolean;
  size?: "sm" | "md";
  layout?: "stacked" | "inline";
  isCurrentUser?: boolean;
  className?: string;
};

export function UserIdentity({
  userId,
  displayName,
  avatarUrl,
  subtitle,
  withProfileLink = true,
  size = "md",
  layout = "stacked",
  isCurrentUser = false,
  className,
}: UserIdentityProps) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const rootClass =
    `user-identity user-identity-${size} user-identity-${layout}` +
    `${isCurrentUser ? " user-identity-current" : ""}` +
    `${className ? ` ${className}` : ""}`;
  const isClickable = withProfileLink && Boolean(userId);
  const profileHref = userId ? `/u/${encodeURIComponent(userId)}` : undefined;
  const content = (
    <div className="user-identity-main">
      {avatarUrl ? (
        <img className="user-identity-avatar" src={avatarUrl} alt={displayName} />
      ) : (
        <span className="user-identity-avatar user-identity-avatar-placeholder">
          {initial}
        </span>
      )}
      <div className="user-identity-meta">
        <span className="user-identity-name">{displayName}</span>
        {subtitle && <span className="muted user-identity-subtitle">{subtitle}</span>}
      </div>
    </div>
  );

  return (
    <div className={rootClass}>
      {isClickable && profileHref ? (
        <a href={profileHref} className="user-identity-link" aria-label={displayName}>
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
