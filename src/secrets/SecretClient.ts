// TODO: Refactor SecretClient to parent package: used in smithers-server && smithers-crawler
import {SecretManagerServiceClient} from '@google-cloud/secret-manager'

interface GetSecretOptions {
  secretName: string;
}

class SecretClient {
  private client: SecretManagerServiceClient
  private static secretClient: Promise<SecretClient>

  public static getInstance(): Promise<SecretClient> {
    if (!SecretClient.secretClient) {
      SecretClient.secretClient = Promise.resolve(new SecretClient())
    }

    return SecretClient.secretClient
  }

  public constructor () {
    this.client = new SecretManagerServiceClient({})
  }

  public async getSecret(opts: GetSecretOptions) {
    const [version] = await this.client.accessSecretVersion({
      name: `projects/593265247388/secrets/${opts.secretName}/versions/latest`,
    });
  
    // Extract the payload as a string.
    return version.payload?.data?.toString()
  }
}

export {
  SecretClient
}