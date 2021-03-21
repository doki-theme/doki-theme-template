import {
  BaseAppDokiThemeDefinition,
  constructNamedColorTemplate,
  DokiThemeDefinitions,
  evaluateTemplates,
  getDisplayName,
  MasterDokiThemeDefinition,
  resolvePaths,
  StringDictionary,
} from "doki-build-source";

type AppDokiThemeDefinition = BaseAppDokiThemeDefinition;

const fs = require("fs");

const path = require("path");

const {
  repoDirectory,
  masterThemeDefinitionDirectoryPath,
} = resolvePaths(__dirname);

// todo: dis
type DokiThemeJupyter = {
  [k: string]: any;
};


function buildTemplateVariables(
  dokiThemeDefinition: MasterDokiThemeDefinition,
  masterTemplateDefinitions: DokiThemeDefinitions,
  dokiThemeAppDefinition: AppDokiThemeDefinition,
): DokiThemeJupyter {
  const namedColors: StringDictionary<string> = constructNamedColorTemplate(
    dokiThemeDefinition,
    masterTemplateDefinitions
  );
  const colorsOverride =
    dokiThemeAppDefinition.overrides.theme?.colors || {};
  const cleanedColors = Object.entries(namedColors)
    .reduce((accum, [colorName, colorValue]) => ({
      ...accum,
      [colorName]: colorValue,
    }), {});
  return {
    ...cleanedColors,
    ...colorsOverride,
  };
}

function createDokiTheme(
  masterThemeDefinitionPath: string,
  masterThemeDefinition: MasterDokiThemeDefinition,
  appTemplateDefinitions: DokiThemeDefinitions,
  appThemeDefinition: AppDokiThemeDefinition,
  masterTemplateDefinitions: DokiThemeDefinitions,
) {
  try {
    return {
      path: masterThemeDefinitionPath,
      definition: masterThemeDefinition,
      stickers: getStickers(masterThemeDefinition, masterThemeDefinitionPath),
      templateVariables: buildTemplateVariables(
        masterThemeDefinition,
        masterTemplateDefinitions,
        appThemeDefinition,
      ),
      theme: {},
      appThemeDefinition: appThemeDefinition,
    };
  } catch (e) {
    throw new Error(
      `Unable to build ${masterThemeDefinition.name}'s theme for reasons ${e}`
    );
  }
}

function resolveStickerPath(themeDefinitionPath: string, sticker: string) {
  const stickerPath = path.resolve(
    path.resolve(themeDefinitionPath, ".."),
    sticker
  );
  return stickerPath.substr(
    masterThemeDefinitionDirectoryPath.length + "/definitions".length
  );
}

const getStickers = (
  dokiDefinition: MasterDokiThemeDefinition,
  themePath: string
) => {
  const secondary =
    dokiDefinition.stickers.secondary || dokiDefinition.stickers.normal;
  return {
    default: {
      path: resolveStickerPath(themePath, dokiDefinition.stickers.default),
      name: dokiDefinition.stickers.default,
    },
    ...(secondary
      ? {
        secondary: {
          path: resolveStickerPath(themePath, secondary),
          name: secondary,
        },
      }
      : {}),
  };
};

console.log("Preparing to generate themes.");
const themesDirectory = path.resolve(repoDirectory, "src", "dokithemejupyter");

evaluateTemplates(
  {
    appName: 'jupyter',
    currentWorkingDirectory: __dirname,
  },
  createDokiTheme
)
  .then((dokiThemes) => {

    fs.writeFileSync(
      path.resolve(themesDirectory, "themes.json"),
      JSON.stringify(
        dokiThemes.reduce((accum, dokiTheme) => ({
          ...accum,
          [getDisplayName(dokiTheme)]: {
            id: dokiTheme.definition.id,
            colors: dokiTheme.templateVariables,
            name: dokiTheme.definition.displayName,
          }
        }), {}),
        null,
        2
      ),
      {
        encoding: "utf-8",
      }
    );
  })
  .then(() => {
    console.log("Theme Generation Complete!");
  });
