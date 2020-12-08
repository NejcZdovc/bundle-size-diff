const core = require('@actions/core')
const fileSize = require('filesize')
const path = require('path')
const { getStatsDiff } = require('webpack-stats-diff')

const getInputs = () => ({
  basePath: core.getInput('base_path'),
  prPath: core.getInput('pr_path')
})

const checkPaths = async () => {
  const { basePath, prPath } = getInputs()
  const base = path.resolve(process.cwd(), basePath)
  const pr = path.resolve(process.cwd(), prPath)

  const baseInclude = require(base)
  const baseAssets = baseInclude && baseInclude.assets
  if (!baseAssets) {
    throw new Error(`Base path is not correct. Current input: ${base}`)
  }

  const prInclude = require(pr)
  const prAssets = prInclude && prInclude.assets
  if (!prAssets) {
    throw new Error(`Pr path is not correct. Current input: ${pr}`)
  }

  return {
    base: baseAssets,
    pr: prAssets
  }
}

const generateData = (assets) => {
  const stats = getStatsDiff(assets.base, assets.pr)

  if (!stats || !stats.total) {
    throw new Error(`Something went wrong with stats conversion, probably files are corrupted.`)
  }

  core.setOutput('base_file_size', stats.total.oldSize)
  core.setOutput('base_file_string', fileSize(stats.total.oldSize))
  core.setOutput('pr_file_size', stats.total.newSize)
  core.setOutput('pr_file_string', fileSize(stats.total.newSize))
  core.setOutput('diff_file_size', stats.total.diff)
  core.setOutput('diff_file_string', fileSize(stats.total.diff))
  core.setOutput('percent', stats.total.diffPercentage.toFixed(2))
  core.setOutput('success', 'true')
}

const run = async () => {
  try {
    const assets = await checkPaths()
    generateData(assets)
  } catch (error) {
    core.setOutput('success', 'false')
    core.setFailed(error.message)
  }
}

run()
