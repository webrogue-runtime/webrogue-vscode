# Webrogue extension for Visual Studio Code

Read about Webrogue at https://webrogue.dev

## Features

- Downloading and updating Webrogue CLI and SDK
- Automatic component updates (can be disabled in settings)
- Debugging Webrogue applications using [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb), [LLDB-DAP](https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.lldb-dap) or built-in fallback LLDB-DAP executable
- Packaging WRAPP files
- Compiling WRAPP files into Windows, Linux and Android applications
- [CMake extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) integration
- Schema for `webrogue.json`

## Requirements

This extension may consume a lot of disk space (up to 2GB) for downloadable components and compilation cache.
To clean this data, navigate to Webrogue extension's screen, click "Cache" link in right table under "Installation" section and remove "build", "compilation_cache" and "components" directories.

## Known Issues

Since both Webrogue and this extensions are at early versions, a lot of features are missing.

After installing Cmake extension and Webrogue SDK component, new cmake kit may not appear in kit list. 
It can be solved by restarting VSCode.
