'use client';

import { useEffect, useRef } from 'react';

/**
 * React 19 replaces `javascript:` hrefs passed through JSX props with a
 * security-error stub, which breaks bookmarklets. Setting the attribute
 * imperatively via a ref (outside React's prop diffing) is the standard
 * workaround and is what lets dragging this link to a bookmarks bar work.
 */
export function BookmarkletLink({
  code,
  className,
  children,
}: {
  code: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute('href', code);
  }, [code]);

  return (
    <a ref={ref} className={className}>
      {children}
    </a>
  );
}
