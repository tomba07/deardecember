// Small inline SVG set. Icons inherit text colour and need no font or network request.
const icons={
 lock:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
};

icons.locked=icons.lock;
const statusSvg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
icons.unopened=statusSvg('<circle cx="12" cy="12" r="9"/>');
icons.pending=statusSvg('<circle cx="12" cy="12" r="9" stroke-dasharray="3 4"/><path d="M12 7v5l3 2"/>');
icons.completed=statusSvg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>');

icons.arrowRight=statusSvg('<path d="M5 12h14m-6-6 6 6-6 6"/>');
