---
version: 1
slug: "components-upload-uploadarea-tsx"
primary_target: "components/upload/UploadArea.tsx"
related_targets: ["app/studio/page.tsx"]
---

# Surface brief: Upload (F3)

Scope and mode: Operate. Lives inside the gallery (settled Proof Sheet world); no dedicated upload pages, and the sidebar keeps only Gallery.
Task: upload one photo or video, then land in its editor. Entry: "Upload image" / "Upload video" buttons in the gallery header, or drop a file anywhere on the gallery.
Constraints: plan limits checked in the browser before uploading (size, video length, asset count), with the reason and an Upgrade link; the server re-checks (upload-auth checks + assets.register). Cancel at any time. Typed errors for network, server, invalid request, abort, and our QUOTA_ASSETS / TOO_LARGE / TOO_LONG / WRONG_TYPE codes.
Unresolved: editor routes arrive in F4/F5.

## Direction contract

THESIS: Dropping a file pulls a proof right where the work is: the gallery area becomes one crop-marked sheet. Refuses a separate upload page and a generic modal dropzone.

OWN-WORLD: The Proof Sheet. One full-area sheet on the neutral grey surround, crop marks at its trim corners, a dashed rule while waiting for a drop and a solid rule once a file is accepted. Limits sit in one mono line with tabular figures. Progress is a single paper-white rule growing across the sheet's foot, with the percentage in a fixed cell. Rejections strike nothing; they name the limit and offer Upgrade.

STORY: The user drags a file and sees at once what they may drop and their limits; they drop it, see their own image, watch it upload, and arrive in the editor. If it breaks a limit they learn which one before anything is sent.

FIRST VIEWPORT: Gallery header with the title and the two Upload buttons at the right. On drag or after picking: the sheet covers the gallery region below the header, heading centred ("Drop a photo or video"), limits line beneath; after the drop the file's preview fills the sheet with its name and size, the progress rule along the bottom edge, Cancel at the bottom right.

FORM: Drop Sheet, position 3 of my ordered list of structures, seed key 0dd9898b.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
