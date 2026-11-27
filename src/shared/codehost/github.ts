// GitHub behind the CodeHost interface: the existing client, unchanged, plus the two calls the
// interface adds. commitFiles makes the same requests in the same order the features made before.
import { GithubError, createGithubClient } from '@shared/github/client'
import type { CodeHost, CodeHostConfig, HostFetch } from './types'

const segments = (path: string) => path.split('/').map(encodeURIComponent).join('/')

export function githubCodeHost(config: CodeHostConfig, fetch: HostFetch, sleep?: (ms: number) => Promise<void>): CodeHost {
  const c = createGithubClient(config, fetch, sleep)
  return {
    kind: 'github', label: 'GitHub', ciName: 'GitHub Actions', config, fetch,
    whoAmI: () => c.whoAmI(),
    listBranches: () => c.listBranches(),
    branchHead: (branch) => c.branchHead(branch),
    readFile: (path, ref) => c.readFile(path, ref),
    readFileWithSha: (path, ref) => c.readFileWithSha(path, ref),
    putFile: (path, content, message, branch, sha) => c.putFile(path, content, message, branch, sha),
    listFolder: (path, ref) => c.listFolder(path, ref),
    openPull: (head, base, title, body) => c.openPull(head, base, title, body),
    findPull: (branch) => c.findPull(branch),
    recentPulls: (base) => c.recentPulls(base),
    runsFor: (sha) => c.runsFor(sha),
    async commitFiles({ parent, message, files, branch, create, fallbackBranch }) {
      // A commit on no branch first, then the branch points at it: the Git Data API's two steps.
      const made = await c.commit(parent, message, files)
      if (!create) {
        await c.moveBranch(branch, made.sha)
        return { ...made, branch }
      }
      try {
        await c.createRef(`refs/heads/${branch}`, made.sha)
        return { ...made, branch }
      } catch (e) {
        if (!fallbackBranch || !(e instanceof GithubError && e.kind === 'exists')) throw e
        await c.createRef(`refs/heads/${fallbackBranch}`, made.sha)
        return { ...made, branch: fallbackBranch }
      }
    },
    createTag: (name, sha) => c.createRef(`refs/tags/${name}`, sha),
    fileUrl: (path, branch) => `${config.web}/${config.repo}/blob/${segments(branch)}/${segments(path)}`,
  }
}
