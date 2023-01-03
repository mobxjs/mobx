/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// See https://docusaurus.io/docs/site-config for all the possible
// site configuration options.

// List of projects/orgs using your project for the users page.
const users = [
    {
        caption: "User1",
        // You will need to prepend the image path with your baseUrl
        // if it is not '/', like: '/test-site/img/image.jpg'.
        image: "/img/undraw_open_source.svg",
        infoLink: "https://www.facebook.com",
        pinned: true
    }
]

const siteConfig = {
    algolia: {
        apiKey: '500db32fbdbd53a814f42aafdfa26bd4',
        indexName: 'mobxjs',
    },
    title: "MobX 🇺🇦", // Title for your website.
    tagline: "Simple, scalable state management",

    // For github.io type URLs, you would set the url and baseUrl like:
    //   url: 'https://facebook.github.io',
    //   baseUrl: '/test-site/',
    url: "https://mobx.js.org", // Your website URL
    baseUrl: "/", // Base URL for your project */
    docsUrl: "", // trim 'docs/ prefix
    cname: "mobx.js.org", // needed for github pages to work under a domain
    // Used for publishing and more

    projectName: "mobx",
    organizationName: "mobxjs",

    // URL for editing docs, usage example: editUrl + 'en/doc1.md'.
    // If this field is omitted, there will be no "Edit this Doc" button
    // for each document.
    editUrl: "https://github.com/mobxjs/mobx/edit/main/docs/",

    // For top-level user or org sites, the organization is still the same.
    // e.g., for the https://JoelMarcey.github.io site, it would be set like...
    //   organizationName: 'JoelMarcey'

    // For no header links in the top nav bar -> headerLinks: [],
    headerLinks: [
        { doc: "api", label: "API Reference" },
        { href: "https://zh.mobx.js.org", label: "中文" },
        { href: "https://ko.mobx.js.org", label: "한국어" },
        { doc: "backers-sponsors", label: "Sponsors" },
        { href: "https://github.com/mobxjs/mobx", label: "GitHub" }
    ],

    // docsSideNavCollapsible: true,

    // If you have users set above, you add it here:
    users,

    /* path to images for header/footer */
    headerIcon: "img/mobx.png",
    footerIcon: "img/mobx.png",
    favicon: "img/favicon.png",

    /* Colors for website */
    colors: {
        primaryColor: "#035193",
        secondaryColor: "#023866"
    },

    /* Custom fonts for website */
    /*
fonts: {
myFont: [
"Times New Roman",
"Serif"
],
myOtherFont: [
"-apple-system",
"system-ui"
]
},
*/

    // This copyright info is used in /core/Footer.js and blog RSS/Atom feeds.
    copyright: `Copyright © ${new Date().getFullYear()} Your Name or Your Company Name`,

    highlight: {
        // Highlight.js theme to use for syntax highlighting in code blocks.
        theme: "default"
    },

    // Add custom scripts here that would be placed in <script> tags.
    scripts: [
        "/js/scripts.js",
        "https://buttons.github.io/buttons.js",
    ],

    // On page navigation for the current documentation page.
    onPageNav: "separate",
    // No .html extensions for paths.
    cleanUrl: false, // similar to old gitbook

    // Open Graph and Twitter card images.
    ogImage: "img/undraw_online.svg",
    twitterImage: "img/undraw_tweetstorm.svg",

    gaTrackingId: "UA-65632006-1",

    // Show documentation's last contributor's name.
    // enableUpdateBy: true,

    // Show documentation's last update time.
    // enableUpdateTime: true,

    // You may provide arbitrary config keys to be used as needed by your
    // template. For example, if you need your repo's URL...
    repoUrl: "https://github.com/mobxjs/mobx"
}

module.exports = siteConfig
