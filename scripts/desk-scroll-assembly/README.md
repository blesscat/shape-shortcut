# Prebuilt documentation assembly geometry

```sh
pnpm generate:desk-scroll-assembly
pnpm verify:desk-scroll-assembly
```

Generation uses the existing native CAD producer and its 38 assembly-contact checks. It exports six printable parts into `public/docs/desk-scroll-assembly/meshes.bin`, with a JSON manifest describing float32 position/normal arrays and uint32 indices at four-byte-aligned offsets. Geometry keeps the CAD builders' millimetres and Z-up coordinates.

The manifest records settings, measured resting datums, native contact results, source hashes and the binary checksum. Verification rejects stale sources, bad checksums, invalid array ranges, nonfinite positions and out-of-range indices. Generation requires the same Node/OCCT environment as the movie generator; the ordinary build and public page never invoke CAD builders.

The browser lazily downloads the shared binary near the guide, then uses the original assembly choreography with reading checkpoints. ScrollTrigger observes native scrolling; there is no wheel interception, scroll smoothing or forced scroll snapping. Compact direct-placement and locating diagrams use explicit steps. Model inspection preserves assembly progress, and reduced motion uses discrete poses. Posters and all instructions render as ordinary HTML when JavaScript or WebGL is unavailable.

The independent movie generation and verification commands remain supported for the landing tutorial. A dependency-lock change also invalidates that pipeline's source provenance; regenerate its movies when required.
