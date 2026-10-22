// Original project media stay intact. The private preview can set a media
// origin so its sparse checkout uses the live portfolio's existing assets.
// Every component that renders a project asset routes through here, so a
// preview build cannot end up with some images resolved and others not.
export const media = (src) => src?.startsWith("/") ? `${import.meta.env.VITE_MEDIA_ORIGIN || ""}${src}` : src;
