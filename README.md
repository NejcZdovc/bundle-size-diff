# Bundle size diff from webpack with Github Actions

Action that allows you to generate diff report between branches. This way you always know when things go sideways :)

![image](https://user-images.githubusercontent.com/9574457/101460311-b820ab80-3939-11eb-887f-77e4448da681.png)

## Inputs

| Name | Description | Required |
| ---- | ----------- | -------- |
| base_path | Path of base branch stats file  | yes |
| pr_path | Path of PR branch stats file | yes |

## Output

| Name | Description | Return |
| ---- | ----------- | ------------ |
| success | Tells you if diff was successfully generated  | `'true'` / `'false'` |
| base_file_size | Bundle size of base branch that you are targeting | bytes |
| base_file_string | Formatted bundle size of base branch | example: `8.1 kb` |
| pr_file_size | Bundle size of PR branch | bytes |
| pr_file_string | Formatted bundle size of PR branch | example:  `8.1 kb` |
| diff_file_size | Diff size of compared branches | bytes |
| diff_file_string | Formatted diff size between branches | example: `8.1 kb` |
| percent | Diff size of compared presented in percentage | example: `0.14%` |

## Usage
The key thing that you will need to do when using this action is to create a stats file from webpack.

You can see the simple [example](webpack_example) that we used in this repo for testing purposes.<br>
You can read more about `webpack-bundle-analyzer` on [authors page](author_page).

To save action minutes I would suggest that you have an action that generates a new state file every time that you merge commit
in the main branch.

An alternative approach is to generate a state file for a base branch on the fly. This approach we used in [our example](workflow) as it's a little bit more complicated.

Let's break down our workflow file.

### Build base
The first job is for building a base branch. In most cases, this would be the main/master branch.

Important note here is that we add `ref: ${{ github.base_ref }}` in checkout action. 
This tells action to checkout base that you set for the PR.

Then we just do regular dependency install and build of our script.

The next section is crucial. We are doing multiple jobs to build stats files so we need to store this data between runs.
To accomplish that we will be using [artifacts](artifacts). Because we only need this data for short period I like to set expiration to 1 day `retention-days: 1`.

```yaml
build-base:
  name: Build base
  runs-on: ubuntu-latest
  steps:
  - name: Checkout
    uses: actions/checkout@v2
    with:
      ref: ${{ github.base_ref }}

  - name: Install dependencies
    run: npm ci
    env:
      NODE_AUTH_TOKEN: ${{secrets.TOKEN_REPO}}

  - name: Build
    run: npm run build-demo

  - name: Upload base stats.json
    uses: actions/upload-artifact@v2
    with:
      name: base
      path: ./demo/demo-dist/stats.json
      retention-days: 1
```

### Build PR
Next thing is to build PR. 

As you can see checkout now just checkouts default which is head of the PR.

```yaml
build-pr:
  name: Build PR
  runs-on: ubuntu-latest
  steps:
  - name: Checkout
    uses: actions/checkout@v2

  - name: Install dependencies
    run: npm ci
    env:
      NODE_AUTH_TOKEN: ${{secrets.TOKEN_REPO}}

  - name: Build
    run: npm run build-demo

  - name: Upload base stats.json
    uses: actions/upload-artifact@v2
    with:
      name: pr
      path: ./demo/demo-dist/stats.json
      retention-days: 1
```

### Compare builds
Now that we have stats files ready, we just need to download them which we are doing with `actions/download-artifact`, and pass them to our action.

In the last section, we take values that were returned from our action and print it out as a nice table via `NejcZdovc/comment-pr`.

```yaml
report:
  name: Generate report
  runs-on: ubuntu-latest
  needs: [build-base, build-pr]

  steps:
  - name: Checkout PR
    uses: actions/checkout@v2

  - name: Download base stats
    uses: actions/download-artifact@v2
    with:
      name: base
      path: base

  - name: Download PR stats
    uses: actions/download-artifact@v2
    with:
      name: pr
      path: pr

  - name: Get diff
    id: get-diff
    uses: NejcZdovc/bundle-size-diff@v1
    with:
      base_path: './base/stats.json'
      pr_path: './pr/stats.json'

  - name: Comment
    uses: NejcZdovc/comment-pr@v1.1.1
    with:
      file: 'comment.md'
    env:
      GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
      OLD: ${{steps.get-diff.outputs.base_file_string}}
      NEW: ${{steps.get-diff.outputs.pr_file_string}}
      DIFF: ${{steps.get-diff.outputs.diff_file_string}}
      DIFF_PERCENT: ${{steps.get-diff.outputs.percent}}
```

## Bugs
Please file an issue for bugs, missing documentation, or unexpected behavior.

## LICENSE

[MIT](license)

[license]: https://github.com/NejcZdovc/comment-pr/blob/master/LICENSE
[webpack_example]: https://github.com/NejcZdovc/bundle-size-diff/blob/main/demo/webpack.config.js
[author_page]: https://github.com/webpack-contrib/webpack-bundle-analyzer
[workflow]: https://github.com/NejcZdovc/bundle-size-diff/blob/main/.github/workflows/example.yml
[artifacts]: https://docs.github.com/en/free-pro-team@latest/actions/guides/storing-workflow-data-as-artifacts
