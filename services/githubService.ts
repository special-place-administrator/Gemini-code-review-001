// Simple client-side interaction with the public GitHub API.

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO_REGEX = /github\.com\/([^/]+\/[^/]+)/;

interface GitHubFile {
  path: string;
  type: 'blob' | 'tree';
}

interface GitHubTreeResponse {
  tree: GitHubFile[];
  truncated: boolean;
}

interface GitHubRepoResponse {
    default_branch: string;
}

interface GitHubBranchResponse {
    commit: {
        sha: string;
        commit: {
            tree: {
                sha: string;
            };
        };
    };
}

interface GitHubContentResponse {
    content: string; // base64 encoded
    encoding: 'base64';
}

/**
 * Parses a GitHub URL to extract the owner and repository name.
 * @param url The full GitHub repository URL.
 * @returns An object with owner and repo, or null if parsing fails.
 */
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const match = url.match(GITHUB_REPO_REGEX);
    if (!match || !match[1]) return null;
    const [owner, repo] = match[1].split('/');
    return { owner, repo };
};


/**
 * Fetches the recursive file tree for the default branch of a public GitHub repository.
 * @param repoUrl The full URL of the GitHub repository.
 * @returns A promise that resolves to an array of file objects.
 */
export const fetchRepoFileTree = async (repoUrl: string): Promise<{ path: string }[]> => {
    const urlParts = parseGitHubUrl(repoUrl);
    if (!urlParts) {
        throw new Error('Invalid GitHub repository URL.');
    }
    const { owner, repo } = urlParts;

    // 1. Get the default branch
    const repoInfoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);
    if (!repoInfoRes.ok) {
        if (repoInfoRes.status === 404) {
            throw new Error('Repository not found. Please check the URL and ensure the repository is public.');
        }
        if (repoInfoRes.status === 403) {
            throw new Error('GitHub API rate limit exceeded (60 requests/hour for unauthenticated users). Please wait a moment and try again.');
        }
        throw new Error(`Could not fetch repository info (status: ${repoInfoRes.status}).`);
    }
    const repoInfo: GitHubRepoResponse = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch;

    // 2. Get the latest commit SHA for the default branch to find the root tree SHA
    const branchInfoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${defaultBranch}`);
    if (!branchInfoRes.ok) {
         if (branchInfoRes.status === 403) {
            throw new Error('GitHub API rate limit exceeded (60 requests/hour for unauthenticated users). Please wait a moment and try again.');
        }
        throw new Error(`Could not fetch branch info (status: ${branchInfoRes.status}).`);
    }
    const branchInfo: GitHubBranchResponse = await branchInfoRes.json();
    const treeSha = branchInfo.commit.commit.tree.sha;

    // 3. Fetch the recursive file tree
    const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    if (!treeRes.ok) {
         if (treeRes.status === 403) {
            throw new Error('GitHub API rate limit exceeded (60 requests/hour for unauthenticated users). Please wait a moment and try again.');
        }
        throw new Error(`Could not fetch file tree (status: ${treeRes.status}).`);
    }
    const treeData: GitHubTreeResponse = await treeRes.json();

    // Filter for files (blobs) only
    return treeData.tree.filter(item => item.type === 'blob').map(item => ({ path: item.path }));
};


/**
 * Fetches the content of a specific file from a GitHub repository.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param path The full path to the file within the repository.
 * @returns A promise that resolves to the string content of the file.
 */
export const getFileContent = async (owner: string, repo: string, path: string): Promise<string> => {
    const contentRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`);
    if (!contentRes.ok) {
        if (contentRes.status === 403) {
            throw new Error('GitHub API rate limit exceeded for this file.');
        }
        throw new Error(`Failed to fetch content for ${path} (status: ${contentRes.status}).`);
    }
    
    const contentData: GitHubContentResponse = await contentRes.json();
    
    // Decode base64 content
    try {
        return atob(contentData.content);
    } catch (e) {
        console.error(`Error decoding base64 content for ${path}:`, e);
        return `// Error: Could not decode content for ${path}`;
    }
};