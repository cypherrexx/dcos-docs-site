const algoliasearch = require("algoliasearch");
const semverRegex = require("semver-regex");
const semver = require("semver");
const sanitizeHtml = require("sanitize-html");
const extname = require("path").extname;
const debug = require("debug")("metalsmith-algolia");

// based on their api repsonses it looks like they use 2bytes for char,
// our plan allows for 10kb, so roughly 50k characters
const MAX_CONTENT_LENGTH = 49000;

/**
 * Search indexing for algolia
 */

module.exports = function algoliaMiddlewareCreator(options = {}) {
  const { ALGOLIA_PRIVATE_KEY } = process.env;
  if (!ALGOLIA_PRIVATE_KEY)
    throw new Error("Env var ALGOLIA_PRIVATE_KEY has not been set.");

  const algoliaProjectId = "Z0ZSQ5T6T2";
  const client = algoliasearch(algoliaProjectId, ALGOLIA_PRIVATE_KEY);
  const indices = {
    "mesosphere-dcos": client.initIndex("mesosphere-dcos"),
    "ksphere-konvoy": client.initIndex("ksphere-konvoy"),
    "ksphere-kommander": client.initIndex("ksphere-kommander"),
    "ksphere-dispatch": client.initIndex("ksphere-dispatch"),
    "ksphere-kubeflow": client.initIndex("ksphere-kubeflow"),
    "ksphere-conductor": client.initIndex("ksphere-conductor"),
  };

  // /**
  //  * Algolia Indexing Settings
  //  */
  // index.setSettings({
  //   distinct: true,
  //   attributeForDistinct: 'path',
  //   searchableAttributes: ['title', 'excerpt', 'content'],
  //   attributesToSnippet: [
  //     'excerpt:40',
  //     'content:40',
  //   ],
  //   attributesForFaceting: ['section', 'product', 'version', 'type'],
  //   customRanking: ['asc(section)', 'desc(product)', 'asc(versionWeight)'],
  // });

  return function metalsmithAlgoliaMiddleware(files, metalsmith, done) {
    const filenames = Object.keys(files);
    const filesToIndex = {};

    filenames.forEach((filename) => {
      if (htmlFile(filename)) {
        // Only index files that are two directories deep, aka mesosphere/dcos/...
        const indexName = filename.split("/").slice(0, 2).join("-");
        if (!indexName.includes("index.html")) {
          filesToIndex[indexName] = filesToIndex[indexName] || [];
          filesToIndex[indexName].push(files[filename]);
        }
      }
    });

    // index the objects
    const products = {
      dcos: "DC/OS",
      konvoy: "Konvoy",
      kommander: "Kommander",
      dispatch: "Dispatch",
      kubeflow: "KUDO Kubeflow",
      conductor: "Conductor",
    };

    const semverMap = buildSemverMap(files);

    const productize = (file, indexFile) => {
      const paths = file.path.split("/");
      indexFile.product = products[paths[1]];

      indexFile.versionNumber = "";

      const setVersion = (section, offset = 0) => {
        indexFile.section = section;
        const product = paths[1 + offset];
        const version = paths[2 + offset];
        if (isVersion(version)) {
          indexFile.versionNumber = version;
          indexFile.versionWeight = semverMap[product][version];
        }
      };

      // DC/OS
      if (paths[1] === "dcos") {
        if (paths[2] === "services") {
          if (paths[3]) {
            indexFile.product = paths[3]
              .split("-")
              .map((word) => {
                word[0] = word[0].toUpperCase();
                return word;
              })
              .join(" ");
          }
          setVersion("Service Docs", 2);
        } else {
          setVersion("DC/OS Docs");
        }
      } else if (paths[1] === "konvoy") {
        if (paths[2] === "partner-solutions") {
          indexFile.section = "Partner Solutions Docs";
          indexFile.versionNumber = "Konvoy Partners";
        } else {
          setVersion("Konvoy Docs");
        }
      } else if (paths[1] === "kommander") {
        setVersion("Kommander Docs");
      } else if (paths[1] === "dispatch") {
        setVersion("Dispatch Docs");
      } else if (paths[1] === "kubeflow") {
        setVersion("KUDO Kubeflow Docs");
      } else if (paths[1] === "conductor") {
        setVersion("Conductor Docs");
      }

      indexFile.version = indexFile.product;
      if (indexFile.versionNumber !== "") {
        indexFile.version += " " + indexFile.versionNumber;
      }
    };

    Object.keys(filesToIndex).forEach((indexName) => {
      const index = indices[indexName];

      // Remove index objects that no longer exist
      const start = new Promise((resolve, reject) => {
        const browser = index.browseAll();
        let hits = [];

        browser.on("result", function onResult(content) {
          hits = hits.concat(content.hits);
        });

        browser.on("error", function onError(err) {
          throw err;
        });

        browser.on("end", function onEnd() {
          const existingFiles = {};
          Object.keys(files)
            .filter((file) => extname(file) === ".html")
            .forEach(
              (filename) => (existingFiles[files[filename].path] = true)
            );

          debug("%d local files", Object.keys(existingFiles).length);
          const indexObjectIDs = hits.map((hit) => hit.objectID);
          debug("%d existing objectIDs in index", indexObjectIDs.length);

          const objectIDsToDelete = indexObjectIDs.filter(
            (id) => !existingFiles[id]
          );
          debug(
            "Deleting %d old objectIDs from index...",
            objectIDsToDelete.length
          );

          index.deleteObjects(objectIDsToDelete, () => {
            resolve();
          });
        });
      });

      const files = filesToIndex[indexName];

      const toAlgolia = (file) => {
        const indexFile = {};
        indexFile["objectID"] = file["path"];
        indexFile["title"] = file["title"];
        indexFile["path"] = file["path"];
        indexFile.createIfNotExists = true;

        if (file.enterprise) indexFile.type = "Enterprise";
        if (file.oss) indexFile.type = "Open Source";
        if (file.community) indexFile.type = "Community";

        indexFile["content"] = transform(sanitize(file.contents, file.path));
        indexFile["excerpt"] = indexFile["content"].slice(0, 200);

        if (indexFile["content"].length === MAX_CONTENT_LENGTH) {
          console.error(
            `Warning: file ${file["path"]} content to large, trimmed to fit.`
          );
        }

        productize(file, indexFile);

        return indexFile;
      };

      const algoliaObjects = files.map((file) => toAlgolia(file));

      start.then(() => {
        const promises = [];

        for (let i = 0; i < algoliaObjects.length; i += 1) {
          const object = algoliaObjects[i];
          promises.push(
            new Promise((resolve, reject) => {
              index.partialUpdateObject(object, (err, _content) => {
                if (err) {
                  console.error(
                    `Algolia: Skipped "${object.objectID}": ${err.message}`
                  );
                  resolve(); // log the error but ignore it, we still want to index everything
                } else {
                  // debug(`Algolia: Updating "${object.objectID}"`);
                }
                resolve();
              });
            })
          );
        }

        promises
          .reduce((promise, item) => {
            return promise.then(() => item.then());
          }, Promise.resolve())
          .then(() => {
            done();
          });
      });
    });
  };
};

//
// Used methods
//

const htmlFile = (filename) => extname(filename) === ".html";

const transformations = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&cent;": "¢",
  "&pound;": "£",
  "&yen;": "¥",
  "&euro;": "€",
  "&copy;": "©",
  "&reg;": "®",
  "\\n": " ",
};

const transform = (content) => {
  let replacedContent = content;
  Object.keys(transformations).forEach((htmlEntity) => {
    const replacement = transformations[htmlEntity];
    const htmlEntRegex = new RegExp(htmlEntity, "g");
    replacedContent = replacedContent.replace(htmlEntRegex, replacement);
  });

  return replacedContent.slice(0, MAX_CONTENT_LENGTH);
};

/**
 * Parses buffer to string and sanitizes html.
 * Removes all tags and replaces with whitespace.
 * @param {Buffer} buffer
 * @param {String} file
 */
const sanitize = (buffer, file) => {
  const string = buffer.toString();
  let parsedString = sanitizeHtml(string, {
    allowedTags: [],
    allowedAttributes: [],
    selfClosing: [],
    nonTextTags: [
      "head",
      "style",
      "script",
      "textarea",
      "noscript",
      "header",
      "footer",
      "nav",
      "aside",
      "section",
    ],
  });
  parsedString = trim(parsedString);
  // Remove extraneous information from content
  // Because this library doesn't have the tools necessary to do it nicely

  // Remove all content up to and including the action buttons
  // Some pages don't have action buttons.
  // For those pages, have the first capture group take nothing
  const headerRegex = /^(.*SharePrintContributeDiscussFeedback|)((\n|.)*)?/;
  const capturedContent = headerRegex.exec(parsedString);
  // Only take the second capture group
  const filteredContent = capturedContent[2];

  if (filteredContent) return filteredContent;

  // There should be no blank pages
  console.error(`Warning: file ${file} has no content.`);
  return "";
};

// Trim whitespace from of string.
const trim = (string) => string.replace(/^\s+|\s+$/g, "");

const isVersion = (version) => /^[0-9]\.[0-9](.*)/.test(version);

const buildSemverMap = (files) => {
  const services = {
    dcos: [],
    konvoy: [],
    kommander: [],
    dispatch: [],
    kubeflow: [],
    conductor: [],
  };

  // Filter
  const filePaths = Object.keys(files);
  for (let i = 0; i < filePaths.length; i += 1) {
    const file = filePaths[i];
    const pathParts = file.split("/");
    const product = pathParts[1];
    let version = pathParts[2];
    if (
      version === "services" &&
      pathParts[4] &&
      /^(v|)[0-9].[0-9](.*)/.test(pathParts[4])
    ) {
      const service = pathParts[3];
      version = pathParts[4];
      services[service] = services[service] || [];
      const serviceVersions = services[service];
      if (serviceVersions.indexOf(version) === -1) {
        serviceVersions.push(version);
      }
    } else if (
      isVersion(version) &&
      services[product].indexOf(version) === -1
    ) {
      services[product].push(version);
    }
  }

  const map = {};
  Object.keys(services).forEach((service) => {
    const serviceVersions = services[service];
    const versionsCleaned = serviceVersions.map(cleanVersion);
    const versionsSorted = sortVerisons(versionsCleaned);
    serviceVersions.forEach((version) => {
      const cv = cleanVersion(version);
      const weight = versionsSorted.indexOf(cv);

      map[service] = map[service] || {};
      map[service][version] = weight;
    });
  });

  return map;
};

const sortVerisons = (versions) => {
  const prereleases = [];
  const released = [];
  versions.forEach((version) => {
    if (semver.parse(version).prerelease.length > 0) {
      prereleases.push(version);
    } else {
      released.push(version);
    }
  });
  return semver.rsort(released).concat(semver.rsort(prereleases));
};

const cleanVersion = (version) => {
  if (semverRegex().test(version)) {
    return version;
  }
  const v = version.split(".");
  if (v.length < 3) {
    v.push("0");
  }
  return v.slice(0, 3).join(".");
};
