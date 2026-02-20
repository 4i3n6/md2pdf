# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/).

New releases are prepended automatically by [release-please](https://github.com/googleapis/release-please).

---

## [2.0.0](https://github.com/4i3n6/md2pdf/compare/md2pdf-v1.1.70...md2pdf-v2.0.0) (2026-02-20)


### ⚠ BREAKING CHANGES

* **css:** Print styles now exclusively in styles-print.css
* **storage:** Remove disk file linking functionality

### ### Added

* **accessibility:** implement WCAG 2.1 AA compliance with semantic HTML, ARIA labels, and keyboard navigation ([7fb0c9c](https://github.com/4i3n6/md2pdf/commit/7fb0c9ca41ff60025d24028ca2479adf234f5517))
* add .md extension to new documents and fix download filename ([61ce986](https://github.com/4i3n6/md2pdf/commit/61ce9867618914a2bc97c06bb3ac981ae699cbc5))
* add automatic version bump on deploy build ([29df48b](https://github.com/4i3n6/md2pdf/commit/29df48b279c2f4ff67aef3c5fab40a8ba2ad0756))
* add landing page, manual, and improvements ([3aef5fc](https://github.com/4i3n6/md2pdf/commit/3aef5fc055c39ec2051fea7a121c4a415c2e1e07))
* add MD download button to sidebar ([73db988](https://github.com/4i3n6/md2pdf/commit/73db988b810b2ce438c04adcbd8f0be57c347805))
* add SQL/DDL syntax highlighting and quick tags ([9c8451b](https://github.com/4i3n6/md2pdf/commit/9c8451bc14b18053c55321a4650c12dbca80c136))
* add YAML and Mermaid quick tags, update documentation ([e2a5bf2](https://github.com/4i3n6/md2pdf/commit/e2a5bf2eaf9bd1a2f4705297b54ebc9cea9ec318))
* auto-detect file extension for syntax highlighting ([10bae65](https://github.com/4i3n6/md2pdf/commit/10bae656d0bc1f86c4ea2861e3e073e6f8f75246))
* complete SPRINT 3 - advanced print features and comprehensive documentation ([0c0b189](https://github.com/4i3n6/md2pdf/commit/0c0b189f4eac579f2308fc168e76f67ffecfcb7a))
* **editor:** add file management UI with save status indicators ([cd5917e](https://github.com/4i3n6/md2pdf/commit/cd5917ee08dff94085e5639a217204ee74de1fc3))
* **editor:** add File System Access API for disk file operations ([95140f0](https://github.com/4i3n6/md2pdf/commit/95140f0951d7bf636f08a39283a3b5ac75e3b4d3))
* **editor:** add font selector, alignment controls, and line break improvements ([9b16815](https://github.com/4i3n6/md2pdf/commit/9b16815339cdecc0e5caab735632d8539dece0ef))
* **editor:** add Markdown syntax highlighting and real-time error detection ([ac2bbd0](https://github.com/4i3n6/md2pdf/commit/ac2bbd0c20de6d27bdabd3567b83810511cc72e4))
* **editor:** add problems panel and quick tags ([eabd0c5](https://github.com/4i3n6/md2pdf/commit/eabd0c54328c7ff407142f5b610a0aa554421e2f))
* enterprise-grade feature set ([0282f21](https://github.com/4i3n6/md2pdf/commit/0282f211ca491f5349a02e972098b885727adafb))
* **i18n:** add bilingual support EN-US and PT-BR ([8494785](https://github.com/4i3n6/md2pdf/commit/8494785feb00dd1d1fb8a99713117fcb6640715e))
* **manual:** add bilingual manual (EN/PT) with SEO sitemap and robots.txt ([4a8163b](https://github.com/4i3n6/md2pdf/commit/4a8163bef1a4f21f60257305aefe03f91fbe926a))
* **manual:** add comprehensive Markdown guide with improved navigation ([232dfb9](https://github.com/4i3n6/md2pdf/commit/232dfb965ba50534599d854bb388b4b3b1ea85ce))
* **manual:** expand manual to 14 pages per language with new content sections ([a20c8b6](https://github.com/4i3n6/md2pdf/commit/a20c8b66804171af58f89c24d3de2f8bb512c073))
* **mermaid:** add Mermaid diagram support with lazy loading ([f522e36](https://github.com/4i3n6/md2pdf/commit/f522e360a998d7faa8fec7c293103a78c4f48eae))
* **mermaid:** add professional print styling with figure structure ([e75471d](https://github.com/4i3n6/md2pdf/commit/e75471db84b81b9f5a53e52049c7a56f61a4cee7))
* **mobile:** add desktop-only overlay blocking mobile access ([97e8319](https://github.com/4i3n6/md2pdf/commit/97e8319c8db54a956b8b5db2c1b921db4a4acbb0))
* **pagebreak:** add explicit page break syntax with visual indicator ([1343b89](https://github.com/4i3n6/md2pdf/commit/1343b89d96186dcd3a5d9d1f2368c99653c51191))
* **preview:** default render output to Open Sans 8pt ([5fd0e49](https://github.com/4i3n6/md2pdf/commit/5fd0e49aca32970c72ca1767a5f1f07657414157))
* **print:** add font size selection for preview and PDF export ([d22e526](https://github.com/4i3n6/md2pdf/commit/d22e526add2091b6958b3202ee38b16a0a32df5a))
* **print:** implement professional A4 print optimization with security ([0b80123](https://github.com/4i3n6/md2pdf/commit/0b801233cb8643bb2e449f0a7590cc3d3076f020))
* **print:** set default A4 margins to 10mm on all sides ([fbf09b3](https://github.com/4i3n6/md2pdf/commit/fbf09b321e2aac0ac0497c8002bcf4cb3b1872ed))
* **pwa:** implement offline-first with detection and update notifications ([a5fb98e](https://github.com/4i3n6/md2pdf/commit/a5fb98e689dd0019dad873640abb4e2fed06e7a6))
* replace native confirm() with custom modal service ([54ae64f](https://github.com/4i3n6/md2pdf/commit/54ae64f065da78bc72550186428982bb140e6dd3))
* **storage:** add unified storage manager with provider pattern ([46f912d](https://github.com/4i3n6/md2pdf/commit/46f912d2a41140d9c748618b6a7324e28440e451))
* **syntax-highlighting:** implement highlight.js for code blocks ([668052a](https://github.com/4i3n6/md2pdf/commit/668052a46ecef49f20fe8e32238e1b3140718567))
* **types:** remove any types and add Window interface for Logger ([4132340](https://github.com/4i3n6/md2pdf/commit/41323404f638a6ec8fe3dd004229ecc4cfcf6f2e))
* **ui:** add resizable splitter between editor and preview panels ([694475b](https://github.com/4i3n6/md2pdf/commit/694475be5c8647b548f2b95affeebba666d4111e))
* **utils:** convert printReporter to TypeScript with strict mode types ([e72afb0](https://github.com/4i3n6/md2pdf/commit/e72afb03b15f612168cb1deb67da010fb7995fb3))
* **version:** add automatic version bump on commit ([395384e](https://github.com/4i3n6/md2pdf/commit/395384e3cc067ce5750664973acfef687912b007))
* **yaml:** add YAML processor for frontmatter and code blocks ([ec4bce0](https://github.com/4i3n6/md2pdf/commit/ec4bce016694bf0347e2524d0a72561cae46b817))


### ### Fixed

* allow page breaks inside long lists and paragraphs ([c938af3](https://github.com/4i3n6/md2pdf/commit/c938af369a49e6f0a701a9689dce9e191a2a5aba))
* apply crypto address truncation directly to table DOM ([ed67431](https://github.com/4i3n6/md2pdf/commit/ed67431a622ecfbfc2339bf688500eeedba30424))
* avoid double delete confirm ([92547e9](https://github.com/4i3n6/md2pdf/commit/92547e9cd48d99cb99f06ddf45d0639838956cb1))
* convert PrintRenderer to class extending marked.Renderer ([33f2986](https://github.com/4i3n6/md2pdf/commit/33f2986bab47a62239a6c85431ed4e2ed3ab6e94))
* correct version display from fake 'SYS.V2.0' to real v1.1.0 ([49056e1](https://github.com/4i3n6/md2pdf/commit/49056e103178b42594d764ad4b03624d9b69f5e0))
* **css:** allow highlight.js syntax colors to work ([e8a6f78](https://github.com/4i3n6/md2pdf/commit/e8a6f78590b4e58857e84ec6e7c058c96e0463cd))
* **css:** allow highlight.js syntax colors to work ([ad72885](https://github.com/4i3n6/md2pdf/commit/ad728858c3f84ac60083996c175f809bbbb40866))
* disable PWA service worker in development mode ([50006e7](https://github.com/4i3n6/md2pdf/commit/50006e71e988254a4c091f4ecc5cc69e71d98841))
* **editor:** improve code validation, storage badges, and code block rendering ([ee137a5](https://github.com/4i3n6/md2pdf/commit/ee137a524d01cb5685288eea9a6e673cd5ecb4cf))
* enforce crypto address truncation for all table cell content ([9916c5b](https://github.com/4i3n6/md2pdf/commit/9916c5bd48a2b0fe95d1620cca77510a3e3828fd))
* fix active document deletion and harden localStorage handling ([e6ed65b](https://github.com/4i3n6/md2pdf/commit/e6ed65be6f4510068303f59d4efee3b4f004f494))
* fix content visibility in print by removing display:none from app-grid ([88d8755](https://github.com/4i3n6/md2pdf/commit/88d87553735f87de3494604aba871ffd62cd0674))
* implement CodeMirror 6 decorations for markdown validation ([4f788ce](https://github.com/4i3n6/md2pdf/commit/4f788ce266950ff181fabb3b451028ca5df06f6c))
* implement real-time markdown validation with visual decorations ([025290b](https://github.com/4i3n6/md2pdf/commit/025290bb0ac62f72b767cb14a4d079afba256eec))
* improve landing page copy and manual structure ([b81d899](https://github.com/4i3n6/md2pdf/commit/b81d899cbf75d1ea6fa1d9d429458f19a8cbef2f))
* improve PDF print margins and remove visual artifacts ([02bc262](https://github.com/4i3n6/md2pdf/commit/02bc26213c02c06312c0243e3dde9d4779c3c31f))
* **manual:** update version references and automate future updates ([11749e1](https://github.com/4i3n6/md2pdf/commit/11749e15b369ba3b5ebd69f3b0dcffa936e286d3))
* **MarkdownValidator:** ignore image regex patterns and add tests ([84bae17](https://github.com/4i3n6/md2pdf/commit/84bae17e4f20455b17950b7f75da3b51f9d7ccec))
* **mermaid:** correct label position and add landscape rotation for wide diagrams ([543b436](https://github.com/4i3n6/md2pdf/commit/543b43629136d519d3d6d9ab7f9584e8fc086d75))
* **mermaid:** only rotate wide diagrams, prevent overlap ([b05b79c](https://github.com/4i3n6/md2pdf/commit/b05b79cd90faf12c4ac4b17c4e912768391a405d))
* **mermaid:** restore width &gt; height check for rotation, improve positioning ([571caad](https://github.com/4i3n6/md2pdf/commit/571caad46d552883b56582673d8039a86f8a50b1))
* **mermaid:** rotate ALL diagrams exceeding page width to prevent overflow ([9c4de4b](https://github.com/4i3n6/md2pdf/commit/9c4de4b5131a3c88b521526c19956ad51519eefc))
* **mermaid:** simplify print CSS to prevent diagram overlap ([fc8040e](https://github.com/4i3n6/md2pdf/commit/fc8040e58833a897c0bb881ea6f6e6afd96393c3))
* **mermaid:** use font-based sizing instead of scale-based approach ([d82de55](https://github.com/4i3n6/md2pdf/commit/d82de556f4db1bd890c2f6bec150f361ebfd590a))
* **mermaid:** use marked extension instead of renderer override ([9284536](https://github.com/4i3n6/md2pdf/commit/92845362db2ab6d233cb08e615e58e662c44c256))
* prevent blank screen after PDF generation ([e9580f2](https://github.com/4i3n6/md2pdf/commit/e9580f24a4c4eaf748bd0a5ba1af511a4992473e))
* prevent double sanitization in markdown rendering ([98a9df0](https://github.com/4i3n6/md2pdf/commit/98a9df042d40db1a689106c91b624f0aea70f92c))
* prevent sidebar overflow from breaking editor scroll ([e63100f](https://github.com/4i3n6/md2pdf/commit/e63100ff410eecbe5848dcf65324b8c3708aceda))
* prevent version bump loop in version file commits ([d238a88](https://github.com/4i3n6/md2pdf/commit/d238a8835da0880f51aa3285959b83f303b4f4ec))
* **print:** improve table fidelity and print preview handling ([ed21a83](https://github.com/4i3n6/md2pdf/commit/ed21a83426ac435912974470d4de8b32fdafd741))
* **print:** match table layout between preview and print ([0ced7ae](https://github.com/4i3n6/md2pdf/commit/0ced7ae2b62ecfbdd54dbb0ac24c9c1b66553ba9))
* **print:** remove page-break from hr, only page-break class triggers it ([fe3b4f8](https://github.com/4i3n6/md2pdf/commit/fe3b4f8806b1a12e8382feaf5e60682d2d593d70))
* **print:** remove URL display after links for preview fidelity ([c48d31d](https://github.com/4i3n6/md2pdf/commit/c48d31dbbc2f4aff91fefd07d706d2198ad4e091))
* **print:** respect user-selected font in print output ([d16f9a4](https://github.com/4i3n6/md2pdf/commit/d16f9a48bbb134309d4cef00e6f5479cb5143b92))
* **print:** restore layout properly after closing print dialog ([36c6ce5](https://github.com/4i3n6/md2pdf/commit/36c6ce5843897e38cb37664bbdb27022d28226c1))
* **print:** revert font-size to 9pt for better screen/print parity ([cfb569a](https://github.com/4i3n6/md2pdf/commit/cfb569ad8075a95eb6a2656de3e21339e4e5d988))
* **print:** sync print styles with screen preview for visual consistency ([079d8f3](https://github.com/4i3n6/md2pdf/commit/079d8f3c859a5c424e567c245ce6afbe3b2262c8))
* reduce font to 10pt and improve print legibility with sans-serif ([1819b31](https://github.com/4i3n6/md2pdf/commit/1819b3147e1e92ac7804760b10a87103a25ca3d3))
* **release:** restore CHANGELOG version headers and fix bump-version CHANGELOG clobbering ([2cf15ca](https://github.com/4i3n6/md2pdf/commit/2cf15cad8fd966921cc99473b1dbab8651c3b57f))
* **render:** preserve table alignment across preview and print ([93d36f4](https://github.com/4i3n6/md2pdf/commit/93d36f49ef7c914921a659f6a27747bcab422e9c))
* replace Courier New font with Liberation Mono for better Unicode/accented characters support in PDF export ([89604cf](https://github.com/4i3n6/md2pdf/commit/89604cfc36c3ac186dc39965b23ecc6df69d3eef))
* revert font to Georgia serif ([3a128d6](https://github.com/4i3n6/md2pdf/commit/3a128d66a61eb6b195e4eba10aea2504ff6d0146))
* service worker and SQL syntax highlighting ([856844d](https://github.com/4i3n6/md2pdf/commit/856844df3a6905381f4b44c7e2167df440054c51))
* **site:** automate footer version update ([f01af3c](https://github.com/4i3n6/md2pdf/commit/f01af3cb14f528ef422ae2c3b333920795814e74))
* stabilize mermaid markdown parsing and crypto address truncation ([491e1d5](https://github.com/4i3n6/md2pdf/commit/491e1d5530145ba0f16ce12772069f8a6531df2b))
* standardize manual pages layout ([5e62193](https://github.com/4i3n6/md2pdf/commit/5e621930bd9cddd54151fb95b1f66bc76460487b))
* **styles:** compact print spacing for better A4 page utilization ([63573bb](https://github.com/4i3n6/md2pdf/commit/63573bb1d3a00dbc74c8866b5ceab1a9737b55b8))
* **styles:** force monospace font and margins in print stylesheet ([2393c9f](https://github.com/4i3n6/md2pdf/commit/2393c9fca549b7ecfc7c14bd6c28b55a0adef47f))
* **styles:** use monospace font and reduce print margins to 10-12mm ([9fc70f2](https://github.com/4i3n6/md2pdf/commit/9fc70f23ef4a08b1a71de7be17d41272f70a8989))
* truncate crypto addresses in table cells ([c19875c](https://github.com/4i3n6/md2pdf/commit/c19875ca9da7556795421534ef2bac3e21b186cd))
* use parser.parseInline() for inline token rendering ([d47306c](https://github.com/4i3n6/md2pdf/commit/d47306ca6c395b8f92d53c8368c04d00477779b4))
* **validator:** consolidate empty link errors into single message ([c98c7a3](https://github.com/4i3n6/md2pdf/commit/c98c7a34eedf9fcceb3f6d57d9da0e3d9e5d487f))
* **yaml:** intercept YAML in code() renderer instead of separate extension ([a4e1c53](https://github.com/4i3n6/md2pdf/commit/a4e1c532eb1ff08a87994347dd905e83d7c02e2f))
* **yaml:** preserve line breaks in multiline strings (literal block |) ([c857b31](https://github.com/4i3n6/md2pdf/commit/c857b311c9cdeea325e5a3d3656d5c60ad1d828d))
* **yaml:** remove box container, render as plain structured text ([2d05641](https://github.com/4i3n6/md2pdf/commit/2d05641625f0f26107c3f54e00dbba7a9e6809f9))
* **yaml:** remove frontmatter support to prevent conflict with hr (---) ([3eeac7a](https://github.com/4i3n6/md2pdf/commit/3eeac7a6267222e2ee2e0ad4f13b63238fe8ad1f))
* **yaml:** use marked extension instead of renderer override ([0b10a54](https://github.com/4i3n6/md2pdf/commit/0b10a54ab2a2ac0b62d683c38367138fff1b5450))


### ### Performance

* **logging:** cap console buffer and throttle render estimates ([4eee301](https://github.com/4i3n6/md2pdf/commit/4eee3015c6b110744eb015228a4eaebffc10bba2))
* **main:** add debounce utility and apply to renderPreview (300ms delay) ([17357e5](https://github.com/4i3n6/md2pdf/commit/17357e59fa3f0b84a5221922bc0563b15fac39f8))
* **print:** reduce repeated container width reads in table validation ([75dfd4f](https://github.com/4i3n6/md2pdf/commit/75dfd4fd17363ab9037a15e4b8583418523c58dc))
* **render:** dedupe preview requests and reuse processed markdown html ([3b071b0](https://github.com/4i3n6/md2pdf/commit/3b071b077951b08dad5cef96f38f27fc6d7060fc))


### ### Changed

* **architecture:** extract DocumentManager service for state management ([e0e7086](https://github.com/4i3n6/md2pdf/commit/e0e7086d77e9cf9804987537a925c9eadaa5be35))
* centralize storage access layer ([b8f8b0c](https://github.com/4i3n6/md2pdf/commit/b8f8b0cbdecfd7c8b0dceda669aa5e008bd3c73a))
* **css:** consolidate print styles into single source of truth (SRP) ([60dbeb2](https://github.com/4i3n6/md2pdf/commit/60dbeb213430b1ae95178a018fd7431f05ca9b20))
* disambiguate duplicate ValidationResult types and fix typecheck errors ([c767e22](https://github.com/4i3n6/md2pdf/commit/c767e22ed1a6a3b3dc696319437fee56cd876b41))
* extract app event bindings ([aa409c4](https://github.com/4i3n6/md2pdf/commit/aa409c4dda3ca30d443817aa9cb540282182c126))
* extract CodeMirror theme to src/editorTheme.ts ([9894437](https://github.com/4i3n6/md2pdf/commit/9894437f697246923e56bdff781c24abd84bf9c3))
* extract debounce utility ([3f7c8b1](https://github.com/4i3n6/md2pdf/commit/3f7c8b1d948aa34ee0670ae5c3a588ba9006a2bc))
* extract document IO/backup service ([3d7d8ab](https://github.com/4i3n6/md2pdf/commit/3d7d8ab20e1e4969f7a846a10f3c64ab6f41e182))
* extract editor language loaders ([7dda55b](https://github.com/4i3n6/md2pdf/commit/7dda55b372fa4a4e04126560a1ec982bdcc5ee0a))
* extract keyboard navigation service ([10b8347](https://github.com/4i3n6/md2pdf/commit/10b83478a12491c34a05696ff2fa988da861b5d4))
* extract markdown diagnostics service ([8637445](https://github.com/4i3n6/md2pdf/commit/8637445bd48fc41b47095605d5d4a33f939087aa))
* extract preview preferences and controls ([db90517](https://github.com/4i3n6/md2pdf/commit/db90517580d3eb81ab6704f3a6ebb9b75c5820ed))
* extract preview service and serialize renders ([4b56e37](https://github.com/4i3n6/md2pdf/commit/4b56e37ef92813d7c94727307973eb6d7c7f3958))
* extract print workflow service ([6cda874](https://github.com/4i3n6/md2pdf/commit/6cda87475d69df42f10321acaec754c23a4e5634))
* extract quick tags service ([085c772](https://github.com/4i3n6/md2pdf/commit/085c772e142de3ad06fa14486d28e02d65503f7f))
* extract save status service ([95df261](https://github.com/4i3n6/md2pdf/commit/95df2612819c29ab2c32fa9a52839710358f98c3))
* extract splitter to dedicated service ([2c1a10a](https://github.com/4i3n6/md2pdf/commit/2c1a10a6417db441a68df89ea02027b469ce9c05))
* improve markdown list rendering and print styling ([d057120](https://github.com/4i3n6/md2pdf/commit/d057120117e8ee4dba74cbed56a9e1c0888677d3))
* **language:** centralize extension and preview-fence mapping ([df014f8](https://github.com/4i3n6/md2pdf/commit/df014f8546c017c7f6a8806890bec3211f8e4538))
* **language:** share codeblock alias normalization with markdown processor ([269833a](https://github.com/4i3n6/md2pdf/commit/269833a9d72b35654508a7cb76468800f091e8f5))
* **main:** convert src/main.js to TypeScript with full strict mode compliance ([4129000](https://github.com/4i3n6/md2pdf/commit/4129000bb68b10a89083df4f73cca95f73fa3d7b))
* **manual:** implement template-based page generation ([cf237a4](https://github.com/4i3n6/md2pdf/commit/cf237a4a2fdc13a7b69e36cb342f1eac2e41e755))
* **markdown:** extract inline style sanitization hook ([32ca12e](https://github.com/4i3n6/md2pdf/commit/32ca12ea3b7ea83cbcb79aa5ea969036a04d045e))
* migrate entire codebase to TypeScript with strict mode ([92c4456](https://github.com/4i3n6/md2pdf/commit/92c44566a6388ab8d81135010dadeb0af56ab99d))
* **pipeline:** unify preview post-processing and print validation stages ([c7e6345](https://github.com/4i3n6/md2pdf/commit/c7e6345de8f4d89c79b1c2739a4b6bae8114ad4b))
* **preview:** centralize post-processing pipeline ([caaf34b](https://github.com/4i3n6/md2pdf/commit/caaf34bc3e385b38c14ff0a8fd8a392c1ecf36b1))
* **print:** split print pipeline stages and reuse validation ([45d0938](https://github.com/4i3n6/md2pdf/commit/45d0938a709f3d01173937cd5e7297b8c930ec4f))
* **print:** stage print workflow into validate-report-print steps ([14deecd](https://github.com/4i3n6/md2pdf/commit/14deecda690c41654a9dcd79a36ea9c27cec8f98))
* **render:** extract markdown preprocess strategy from preview service ([b0a7d8f](https://github.com/4i3n6/md2pdf/commit/b0a7d8f1ff3bd1611a724393f6788f75955d7c8c))
* **render:** share utf8 base64 decoder for processors ([2bfcb76](https://github.com/4i3n6/md2pdf/commit/2bfcb76a7aeb7e0b7883c7e1790665f8472d8fdb))
* **storage:** remove File System Access API, simplify to localStorage only ([873b396](https://github.com/4i3n6/md2pdf/commit/873b3969981b9d2528ac1a87249159ea4f48fbd3))
* **swUpdateNotifier:** remove type casting with any, use Window interface ([98f7034](https://github.com/4i3n6/md2pdf/commit/98f70341e7e39a0c539109b872648a30f5deba08))
* translate all PT-BR source identifiers and comments to EN-US ([5b6a5d6](https://github.com/4i3n6/md2pdf/commit/5b6a5d627219931292e09230d3ef7ee3895af268))
* translate all remaining PT-BR identifiers, comments, and strings to EN-US ([f7aeec4](https://github.com/4i3n6/md2pdf/commit/f7aeec4cb44371362bfe5533132ac4a9b726ff5d))
* translate all remaining PT-BR runtime strings to EN-US ([e814038](https://github.com/4i3n6/md2pdf/commit/e814038886862c85d286b33d9b71de82b1cd983a))
* **ui:** simplify storage badges to single-letter labels ([d53bde5](https://github.com/4i3n6/md2pdf/commit/d53bde55c878c1fd9a15843ac0f2368f7e497284))
* **utils:** convert printUtils.js to TypeScript with strict mode types ([488fdbd](https://github.com/4i3n6/md2pdf/commit/488fdbd7ff8b8d8f8ad5796b111a98eab18c7233))


### ### Tests

* **DocumentManager:** add unit tests for document service ([488f057](https://github.com/4i3n6/md2pdf/commit/488f05769e38ebd3f1d4ddee970c3943f4eac019))
* **visual:** add playwright render/print fidelity suite ([5f8cdd4](https://github.com/4i3n6/md2pdf/commit/5f8cdd4b3e633a1b323291826d7864c6fbabdd95))
* **visual:** assert computed table alignment and refresh snapshots ([6f549ee](https://github.com/4i3n6/md2pdf/commit/6f549eed069a430ee77efd805936b5a443df67b6))


### ### Documentation

* add CHANGELOG.md and configure version synchronization ([016e9f6](https://github.com/4i3n6/md2pdf/commit/016e9f68ebc4f86ad5706ada21acf1a0159980a9))
* add comprehensive sprint summary and completion report ([1b96928](https://github.com/4i3n6/md2pdf/commit/1b969282f4cd6ed472805c560b6b9cb65b6be5ec))
* add comprehensive syntax highlighting verification report ([2dc53b8](https://github.com/4i3n6/md2pdf/commit/2dc53b84fa12bf42fc7b441ae256333945aa6805))
* add final multiagent verification report - all pendencies resolved ([caebe8a](https://github.com/4i3n6/md2pdf/commit/caebe8af9c8be8b84ec22c41721b906bc2275148))
* add privacy badges to README and sync manual footer to v1.1.70 ([1051f56](https://github.com/4i3n6/md2pdf/commit/1051f56a5cd635d2101f2dabfa57b5f6fb968048))
* add project completion and testing documentation ([d48dcf6](https://github.com/4i3n6/md2pdf/commit/d48dcf60d2791b1000fa58d057702c44d24ff66b))
* add QA checklist and strengthen smoke test ([594a3fe](https://github.com/4i3n6/md2pdf/commit/594a3fee82ef3370d7e728d9d33cebe46b38c8d7))
* add Sprint 4 completion summary and metrics ([75bf762](https://github.com/4i3n6/md2pdf/commit/75bf7621ef01205d6883e315a4a9de6a75eec853))
* add Sprint 4 quick reference guide for keyboard shortcuts and accessibility features ([b0f0484](https://github.com/4i3n6/md2pdf/commit/b0f0484690c52def56e0747b64687c575ac13944))
* fix AGENTS.md — project uses TypeScript, not vanilla JavaScript ([98a08ef](https://github.com/4i3n6/md2pdf/commit/98a08ef4e5cd4920852be2f0ae4ae57cf797c139))
* **imageProcessor:** add JSDoc and improve code documentation ([2a8384a](https://github.com/4i3n6/md2pdf/commit/2a8384ae1d5a09ae8deec3c1ed74f39eb555c7df))
* **manual:** update page break documentation and footer text ([b4fe3d5](https://github.com/4i3n6/md2pdf/commit/b4fe3d502c5e99bc718cdd242433d9320ff86010))
* **markdownProcessor:** add comprehensive JSDoc to all public functions ([c5e5272](https://github.com/4i3n6/md2pdf/commit/c5e52725045b00b1b14b2898941259158369acb5))
* reorganize documentation into /docs folder ([051af51](https://github.com/4i3n6/md2pdf/commit/051af517ab535fad9b30f16fe4193e61d04a2a78))
* rewrite README with comprehensive feature coverage and accurate badges ([e7856d6](https://github.com/4i3n6/md2pdf/commit/e7856d674bab6036e77a5efae875a8f616d8cb8b))
* **syntax-highlighting:** add comprehensive documentation ([dc74b83](https://github.com/4i3n6/md2pdf/commit/dc74b832cd94738cbc3d309b2ae8170e30073b9a))
* **syntax-highlighting:** add quick start guide ([8348ad1](https://github.com/4i3n6/md2pdf/commit/8348ad17d08972f55173de37181f36989af760df))
* update project status with syntax highlighting ([f855ed4](https://github.com/4i3n6/md2pdf/commit/f855ed4501b450f0abd794d0bbe23451eb0b6900))


### ### Style

* **preview:** add heading spacing for h3-h6 before content blocks ([5b036d2](https://github.com/4i3n6/md2pdf/commit/5b036d2152b0c5b6a5d710f9a0669dac57dbe232))
* **ui:** improve code fence label contrast ([ed9eede](https://github.com/4i3n6/md2pdf/commit/ed9eedea08886567eab2f04efeb6c4f7c990f3ba))

## [Unreleased]

---

## [1.1.70] — 2026-02-20

This release completes the repository migration and establishes the automated release infrastructure. The project moved to its permanent home at `github.com/4i3n6/md2pdf` with full commit history preserved and all 172 commits rewritten to reflect the sole author identity. Git hooks in `.githooks/` now enforce this identity on every commit and reject non-English commit messages. The `bump-version.mjs` script received a targeted fix: it was incorrectly replacing every version header in `CHANGELOG.md` with the current version on each patch bump, clobbering historical entries. The version bump mechanism was replaced entirely by release-please, which handles semantic versioning, changelog generation, and GitHub Release creation automatically based on conventional commit messages.

### Added
- `.githooks/commit-msg` rejecting non-English verb patterns in commit subjects
- `release-please-config.json` with extra-files for all version-bearing HTML, TS, and JSON files
- `.release-please-manifest.json` anchoring the release baseline at v1.1.70
- `.github/workflows/release-please.yml` for fully automated release management

### Fixed
- `bump-version.mjs` clobbering historical CHANGELOG version headers on every patch bump
- Three remaining PT-BR commit messages translated to EN-US

### Changed
- Pre-commit hook simplified to author identity check only — version bumping delegated to release-please
- `bump-version.mjs` retained as a manual sync tool (`node scripts/bump-version.mjs sync`)

---

## [1.1.67] — 2026-02-18

Dual focus: a major internal quality sprint spanning early February, followed by a public release preparation pass.

The first phase decomposed the monolithic `main.ts` into focused service modules — preview, print workflow, keyboard navigation, quick tags, document I/O, save status, and the resizable splitter — each with single responsibility and a clear interface boundary. The print pipeline was redesigned into discrete validate → report → print stages, enabling pre-flight checks against the live preview DOM before triggering `window.print()`. A Playwright visual regression suite was introduced to assert rendering fidelity between the screen preview and print output, including table alignment and heading spacing. Performance work reduced redundant preview renders through deduplication and HTML reuse. The logging system was capped to prevent console buffer overflow under high-frequency edits. Crypto address strings in table cells are now automatically truncated to prevent layout overflow in PDF output.

The second phase prepared the project for open-source distribution. MIT license, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` were added. A GitHub Actions CI pipeline validates every push with typecheck, unit tests, and a production build. Unit tests for `DocumentManager` using Vitest and JSDOM were introduced, covering the core document lifecycle — create, update, delete, and schema migration. The native browser `confirm()` dialog was replaced with a custom accessible modal service supporting danger, warning, and info variants with full keyboard control. The CodeMirror theme was extracted to `src/editorTheme.ts` as a standalone module, decoupling color customization from editor initialization. TypeScript strict mode violations were resolved by disambiguating duplicate `ValidationResult` type names across modules, and Markdown validation was improved to correctly ignore image URL patterns.

### Added
- Playwright visual regression suite asserting render/print fidelity across table alignment and heading spacing
- Crypto address truncation in table cells to prevent PDF layout overflow
- MIT license, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- GitHub Actions CI workflow (typecheck, Vitest, build)
- Unit tests for `DocumentManager` covering document lifecycle and schema migration
- Custom modal service replacing native `confirm()`, with accessible dialog and keyboard handling
- `src/editorTheme.ts` extracted as a reusable CodeMirror extension

### Changed
- Decomposed `main.ts` into independent service modules: preview, print, keyboard, quick tags, I/O, save status, splitter
- Print pipeline staged into validate → report → print phases
- Unified preview post-processing and print validation into a shared pipeline
- CodeMirror language extension and fence alias mapping centralized

### Fixed
- Duplicate `ValidationResult` type names causing TypeScript errors
- Markdown validator incorrectly flagging image URL patterns as errors
- Table alignment preservation between preview and print
- URL display after links removed from print output for WYSIWYG parity
- Duplicate preview render requests under rapid editing

---

## [1.1.25] — 2026-01-24

A focused print fidelity release addressing font encoding and visual consistency between the editor preview and the exported PDF.

Liberation Mono replaced Courier New as the monospace font for code blocks in PDF output. Courier New has poor Unicode coverage and drops or misrenders accented characters and many non-Latin glyphs. Liberation Mono shares the same metrics, is metrically compatible with Courier New, and provides reliable rendering across character sets. A font size selector was added for both the preview and PDF export — the range 6pt to 12pt covers everything from dense financial tables to readable document prose — and the selected size is persisted per document rather than globally. The table layout engine was corrected to match between screen preview and print, resolving alignment inconsistencies that appeared when exporting tables with mixed-width columns. URL display after hyperlinks was removed from print output to achieve true WYSIWYG parity: what you see in the editor preview is exactly what gets printed.

### Added
- Font size selector (6pt–12pt) for preview and PDF export, persisted per document

### Fixed
- Replace Courier New with Liberation Mono for correct Unicode and accented character rendering in PDF output
- Table column alignment mismatch between screen preview and print output
- URL display after links removed from print for WYSIWYG parity

---

## [1.1.21] — 2025-12-28

Immediate patch following v1.1.20.

Two regressions were caught post-release. The service worker was registering in development mode, causing stale cache hits that prevented hot reload from working and made iterating on the app extremely frustrating. The registration guard was tightened to check for the production environment before activating the worker. A CSS specificity conflict was discovered: an `!important` declaration on the base code text color rule was winning over highlight.js token classes, effectively disabling all language-specific syntax coloring — SQL keywords, string literals, and comments were rendering as plain text. Removing the `!important` resolved the specificity chain and restored full syntax coloring.

### Fixed
- Service worker disabled in development mode to prevent stale cache interference with hot reload
- CSS specificity conflict where `!important` on base code color overrode highlight.js token classes, breaking all syntax coloring

---

## [1.1.20] — 2025-12-28

This release substantially expanded the editor's language and diagram capabilities and introduced the first enterprise-grade structural features.

SQL and DDL syntax highlighting was added using highlight.js's SQL grammar, with dedicated quick-tag buttons for common SQL constructs and print-safe code block styles that prevent long queries from overflowing the page. A YAML processor was built using `js-yaml`, providing structured HTML rendering of both YAML frontmatter and fenced YAML code blocks, loaded lazily to avoid impacting parse time for documents with no YAML. Mermaid diagram print support was completely overhauled: wide diagrams now automatically detect when they exceed the page width and rotate to landscape orientation; page breaks are managed per diagram to prevent splits mid-figure; and label positioning was corrected for class, state, and entity-relationship diagrams which were previously rendering labels at incorrect coordinates after scaling.

A resizable splitter was implemented between the editor and preview panels. The divider can be dragged to any ratio, double-clicked to reset to 50/50, and its position is persisted to localStorage. File extension auto-detection was added for drag-and-drop: dropping a `.sql`, `.yaml`, `.py`, or other recognized file now wraps the content in the correct fenced code block automatically. A Markdown download button was added to the sidebar for direct export without going through the print dialog.

### Added
- SQL and DDL syntax highlighting with quick-tag buttons and print-safe code block styles
- YAML processor using `js-yaml` with structured rendering and lazy loading
- YAML and Mermaid quick-tag buttons in the editor toolbar
- Resizable splitter between editor and preview panels, with localStorage persistence and double-click reset
- File extension auto-detection on drag-and-drop for automatic code fence wrapping
- Markdown download button in the sidebar

### Fixed
- Mermaid print layout: landscape rotation for wide diagrams, per-diagram page breaks
- Mermaid label positioning for class, state, and ER diagrams
- Sidebar overflow that was breaking editor scroll behavior

---

## [1.1.10] — 2025-12-08

This release added Mermaid diagram support, a bilingual interface, a comprehensive manual, and explicit page break control — completing the document production feature set for the 1.1 line.

Mermaid was integrated with lazy loading so the library is only fetched when the editor detects a `mermaid` code fence. Flowcharts, sequence diagrams, Gantt charts, entity-relationship diagrams, and pie charts all render inline in the live preview. Print styling was included from the start to ensure diagram output matches the preview without additional configuration. A bilingual interface was implemented in full — every UI string is translated in both English and Portuguese, with language detection based on the URL path (`/` for EN-US, `/pt/` for PT-BR). The manual was expanded to 14 pages per language with sections covering the full keyboard reference, syntax guide, print configuration, and diagram authoring. Explicit page breaks were added via `<!-- pagebreak -->` syntax, with a subtle visual indicator in the preview showing where the page will break in print.

### Added
- Mermaid diagram support (flowcharts, sequence, Gantt, ER, pie) with lazy loading and print styling
- Bilingual interface: English (`/`) and Portuguese (`/pt/`) with full i18n coverage
- Bilingual manual: 14 pages per language covering keyboard shortcuts, syntax, and diagrams
- Explicit page break syntax (`<!-- pagebreak -->`) with visual preview indicator
- Desktop-only overlay blocking mobile access with a clear message
- Automatic version bump script propagating version across all HTML, TS, and JSON files on commit

### Fixed
- Print font inheritance from the user's preview selection
- Print stylesheet consolidated to a single source of truth

---

## [1.1.0] — 2025-12-07

A comprehensive engineering pass covering the entire codebase: TypeScript migration, PWA implementation, real-time validation, accessibility, and editor extensibility.

The entire codebase was migrated from JavaScript to TypeScript with strict mode enabled. All `any` types were eliminated and a `Window` interface extension was defined for the global `Logger`. `DocumentManager` was extracted as a dedicated service — all document state, persistence, and migration logic was moved out of `main.ts` into a testable, single-responsibility class. A debounce utility was introduced and applied to preview rendering to eliminate redundant re-renders on rapid keystroke sequences. The PWA implementation was completed: a service worker with offline-first caching, installation support, and an update notification UI that prompts users to reload when a new version is deployed.

Real-time Markdown validation was implemented using CodeMirror 6's decoration API, surfacing syntax errors as inline squiggles directly in the editor. WCAG 2.1 AA accessibility compliance was added through semantic HTML, comprehensive ARIA labels, and full keyboard navigation across all interactive controls. The editor gained a font family selector, text alignment controls, a problems panel listing all current validation errors, and a quick-tag toolbar with buttons for headings, bold, italic, code, links, and tables. A unified storage manager was introduced with a provider pattern, initially backed by localStorage, designed to support additional backends without changes to the consumer code.

### Added
- Full TypeScript migration with strict mode — zero `any` types, `Window` interface extension for `Logger`
- `DocumentManager` service extracted from `main.ts` for isolated document lifecycle management
- Debounce utility applied to preview rendering (300ms delay)
- PWA: offline-first service worker, installation prompt, update notification UI
- Real-time Markdown validation with CodeMirror 6 decoration squiggles
- WCAG 2.1 AA compliance: semantic HTML, ARIA labels, full keyboard navigation
- Font family selector, text alignment controls, problems panel, quick-tag toolbar
- Unified storage manager with provider pattern backed by localStorage

### Fixed
- `PrintRenderer` converted to class extending `marked.Renderer` for correct token handling
- `parser.parseInline()` used for inline token rendering instead of raw string manipulation
- Double sanitization in the Markdown rendering pipeline removed
- Blank screen after the PDF generation dialog was closed

---

## [1.0.0] — 2025-12-02

Initial release of md2pdf: a client-side Markdown editor built around a print-first philosophy.

The core architecture was established in this release: a CodeMirror 6 editor with split-pane live preview, document persistence in localStorage, and PDF export through the browser's native print dialog. No servers, no accounts, no data leaving the user's machine. The print output was the primary design constraint — the stylesheet was authored independently from the screen preview to give precise control over A4 layout: configurable margins, font size, page break control, and removal of visual artifacts that appear on screen but should not appear in print. highlight.js was integrated for syntax highlighting across 30+ languages. A Markdown download button provides a quick export path without going through the print dialog. The service worker was scoped to production only to prevent development cache interference.

### Added
- CodeMirror 6 editor with split-pane live preview
- localStorage document persistence with multi-document workspace management
- PDF export via `window.print()` with a dedicated A4 print stylesheet
- highlight.js syntax highlighting across 30+ languages
- Markdown download button in the sidebar
- PWA service worker (production only)
- Landing page, bilingual manual, SEO sitemap, and robots.txt

### Fixed
- Page break control for long lists and paragraphs preventing mid-element splits
- Print margins and removal of visual artifacts in PDF output
- Content visibility in print by correcting `display:none` on the app layout grid
